"""
Capital Pyre — CRS Scoring Microservice
Python 3.12 + FastAPI

Computes the Capital Readiness Score (CRS) for entrepreneurs and SMEs.
Called by the Node.js backend via HTTP POST /compute.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

app = FastAPI(title="Capital Pyre CRS Engine", version="1.0.0")

# ── Request / Response models ──────────────────────────────

class ProfileData(BaseModel):
    business_name:     Optional[str] = None
    sector:            Optional[str] = None
    stage:             Optional[str] = None
    pitch_summary:     Optional[str] = None
    problem_statement: Optional[str] = None
    solution:          Optional[str] = None
    market_size:       Optional[str] = None
    revenue_model:     Optional[str] = None
    traction:          Optional[str] = None
    funding_ask:       Optional[float] = None
    year_established:  Optional[int] = None
    employee_count:    Optional[int] = None
    revenue_band:      Optional[str] = None
    cipa_reg_no:       Optional[str] = None
    website:           Optional[str] = None

class CRSRequest(BaseModel):
    role:      str                 # 'entrepreneur' | 'sme'
    profile:   ProfileData
    documents: List[str] = []     # list of doc_type strings uploaded

class CRSResponse(BaseModel):
    crs_score:  float
    breakdown:  dict
    band:       str                # 'low' | 'medium' | 'high'
    tips:       List[str]

# ── Scoring functions ──────────────────────────────────────

def score_financial_health(profile: ProfileData, documents: List[str]) -> float:
    """
    Max 25 pts.
    Based on revenue band, employee count, and financial docs uploaded.
    """
    score = 0.0

    revenue_map = {
        'above-5m':  25,
        '1m-5m':     20,
        '500k-1m':   14,
        '100k-500k':  8,
        'under-100k': 3,
    }
    score += revenue_map.get(profile.revenue_band or '', 0)

    # Cap at 25
    return min(score, 25.0)


def score_governance(profile: ProfileData, documents: List[str]) -> float:
    """
    Max 20 pts.
    CIPA registration, tax clearance, website presence.
    """
    score = 0.0
    if profile.cipa_reg_no:   score += 10
    if 'tax_clearance'  in documents: score += 6
    if 'cipa_certificate' in documents: score += 2
    if profile.website:       score += 2
    return min(score, 20.0)


def score_track_record(profile: ProfileData) -> float:
    """
    Max 20 pts.
    Years in business, employee count, traction.
    """
    score = 0.0
    from datetime import date
    if profile.year_established:
        years = date.today().year - profile.year_established
        if years >= 5:   score += 10
        elif years >= 3: score += 7
        elif years >= 1: score += 4
        else:            score += 1

    employees = profile.employee_count or 0
    if employees >= 50:  score += 6
    elif employees >= 10: score += 4
    elif employees >= 3:  score += 2
    elif employees >= 1:  score += 1

    if profile.traction and len(profile.traction.strip()) > 30:
        score += 4

    return min(score, 20.0)


def score_documentation(documents: List[str], role: str) -> float:
    """
    Max 20 pts.
    Percentage of required documents uploaded.
    """
    required_sme = [
        'income_statement', 'balance_sheet', 'tax_clearance',
        'cipa_certificate', 'bank_statement', 'business_plan'
    ]
    required_ent = ['business_plan', 'income_statement']

    required = required_sme if role == 'sme' else required_ent
    uploaded = set(documents)
    matched = sum(1 for d in required if d in uploaded)
    pct = matched / len(required) if required else 0
    return round(pct * 20, 2)


def score_pitch_quality(profile: ProfileData) -> float:
    """
    Max 15 pts.
    Completeness and depth of the business pitch.
    """
    score = 0.0
    fields = [
        (profile.pitch_summary,     3),
        (profile.problem_statement, 3),
        (profile.solution,          3),
        (profile.market_size,       3),
        (profile.revenue_model,     3),
    ]
    for value, pts in fields:
        if value and len(value.strip()) >= 30:
            score += pts
        elif value and len(value.strip()) > 0:
            score += pts * 0.5

    return min(score, 15.0)


def get_band(score: float) -> str:
    if score >= 70:  return 'high'
    if score >= 40:  return 'medium'
    return 'low'


def generate_tips(breakdown: dict, profile: ProfileData, documents: List[str]) -> List[str]:
    tips = []
    if breakdown['financial_health'] < 15:
        tips.append("Upload recent financial statements to improve your Financial Health score.")
    if breakdown['governance'] < 10:
        tips.append("Add your CIPA registration number and upload your tax clearance certificate.")
    if breakdown['track_record'] < 10:
        tips.append("Add your year of establishment and employee count to your profile.")
    if breakdown['documentation'] < 12:
        tips.append("Upload more supporting documents (business plan, bank statements) to boost your score.")
    if breakdown['pitch_quality'] < 10:
        tips.append("Expand your pitch: add a detailed problem statement, solution, and market size section.")
    if not tips:
        tips.append("Great score! Keep your profile and documents up to date to maintain investor confidence.")
    return tips


# ── Endpoints ──────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "Capital Pyre CRS Engine is running", "version": "1.0.0"}


@app.post("/compute", response_model=CRSResponse)
def compute_crs(req: CRSRequest):
    p  = req.profile
    docs = req.documents
    role = req.role

    financial_health = score_financial_health(p, docs)
    governance       = score_governance(p, docs)
    track_record     = score_track_record(p)
    documentation    = score_documentation(docs, role)
    pitch_quality    = score_pitch_quality(p)

    total = round(financial_health + governance + track_record + documentation + pitch_quality, 2)

    breakdown = {
        "financial_health": financial_health,
        "governance":       governance,
        "track_record":     track_record,
        "documentation":    documentation,
        "pitch_quality":    pitch_quality,
    }

    return CRSResponse(
        crs_score=total,
        breakdown=breakdown,
        band=get_band(total),
        tips=generate_tips(breakdown, p, docs),
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
