"""Pydantic schemas — request/response models."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ------------------------------------------------------------------ auth

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    institution_id: int | None = None


# ------------------------------------------------------------------ core models

class InstitutionOut(BaseModel):
    id: int
    name: str
    state: str
    aicte_code: str

    model_config = ConfigDict(from_attributes=True)


class CourseOut(BaseModel):
    id: int
    institution_id: int
    name: str
    branch: str
    academic_year: str
    approved_intake: int
    approved_supernumerary: int

    model_config = ConfigDict(from_attributes=True)


class StudentOut(BaseModel):
    """Full student record — only for institution_admin of the owning institution."""
    id: int
    apaar_id: str | None = None  # NULL for nri/oci/fn students (passport instead)
    passport_no: str | None = None
    institution_id: int
    course_id: int
    student_code: str
    full_name: str
    dob: date | None
    gender: str
    category: str
    quota_type: str
    nationality: str
    admission_date: date | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentMaskedOut(BaseModel):
    """Masked student view for AICTE dashboards (system.md §6 privacy)."""
    id: int
    apaar_id_masked: str
    full_name_masked: str
    institution_id: int
    course_id: int
    category: str
    quota_type: str
    status: str


class UploadSummary(BaseModel):
    upload_id: int
    total: int
    valid: int
    errors: int
    warnings: int
    by_rule: dict[str, int]


# ------------------------------------------------------------------ audit

class AuditEntry(BaseModel):
    id: int
    user_id: int | None
    role: str
    action: str
    resource: str
    resource_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
