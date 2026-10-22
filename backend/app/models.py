"""SQLAlchemy models — data model from system.md §2."""
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

# ---------------------------------------------------------------- constants

# system.md §1 — roles
ROLE_INSTITUTION_ADMIN = "institution_admin"
ROLE_AICTE_OFFICER = "aicte_officer"
ROLE_AICTE_ADMIN = "aicte_admin"
ROLE_VERIFIER = "verifier"
ROLES = {ROLE_INSTITUTION_ADMIN, ROLE_AICTE_OFFICER, ROLE_AICTE_ADMIN, ROLE_VERIFIER}

# system.md §2 — student status lifecycle
STATUS_PENDING = "pending"
STATUS_VALID = "valid"
STATUS_FLAGGED = "flagged"
STATUS_REJECTED = "rejected"
STATUSES = {STATUS_PENDING, STATUS_VALID, STATUS_FLAGGED, STATUS_REJECTED}

# system.md §2 — quota types
QUOTA_TYPES = {"regular", "supernumerary", "nri", "oci", "fn"}

# system.md §4 — upload lifecycle
UPLOAD_STATUSES = {"uploaded", "parsing", "validating",
                   "completed", "completed_with_errors", "failed"}


# ---------------------------------------------------------------- tables


class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    aicte_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    courses: Mapped[list["Course"]] = relationship(back_populates="institution")
    users: Mapped[list["User"]] = relationship(back_populates="institution")


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (
        Index("uq_course_year", "institution_id", "name", "academic_year", unique=True),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    branch: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    academic_year: Mapped[str] = mapped_column(String(9), nullable=False)  # e.g. "2026-27"
    approved_intake: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    approved_supernumerary: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    institution: Mapped["Institution"] = relationship(back_populates="courses")


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        Index("idx_students_apaar", "apaar_id"),
        Index("idx_students_inst_course", "institution_id", "course_id"),
        # system.md §2: unique active enrolment per (apaar, institution, course)
        Index(
            "uq_active_enrolment",
            "apaar_id",
            "institution_id",
            "course_id",
            unique=True,
            postgresql_where=text("status IN ('valid','flagged')"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    apaar_id: Mapped[str] = mapped_column(String(12), nullable=False)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    student_code: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dob: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    category: Mapped[str] = mapped_column(String(20), nullable=False, default="GENERAL")
    quota_type: Mapped[str] = mapped_column(String(20), nullable=False, default="regular")
    nationality: Mapped[str] = mapped_column(String(50), nullable=False, default="INDIAN")
    admission_date: Mapped[date | None] = mapped_column(Date)
    email_hash: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=STATUS_PENDING)
    source_upload_id: Mapped[int | None] = mapped_column(
        ForeignKey("uploads.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class Upload(Base):
    __tablename__ = "uploads"
    __table_args__ = (Index("idx_uploads_inst", "institution_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    valid_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    invalid_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="uploaded")
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    flags: Mapped[list["ValidationFlag"]] = relationship(back_populates="upload")


class ValidationFlag(Base):
    __tablename__ = "validation_flags"
    __table_args__ = (Index("idx_flags_upload", "upload_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    upload_id: Mapped[int] = mapped_column(
        ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[int | None] = mapped_column(
        ForeignKey("students.id", ondelete="SET NULL")
    )
    row_number: Mapped[int | None] = mapped_column(Integer)  # 1-based data row
    rule_code: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(10), nullable=False)  # error | warning
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details_json: Mapped[str | None] = mapped_column(Text)  # JSON string
    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    upload: Mapped["Upload"] = relationship(back_populates="flags")


class AnomalyScore(Base):
    __tablename__ = "anomaly_scores"
    __table_args__ = (Index("idx_anomaly_inst_course", "institution_id", "course_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[int | None] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE")
    )
    academic_year: Mapped[str] = mapped_column(String(9), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    reasons_json: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    verifier_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    purpose: Mapped[str] = mapped_column(String(255), nullable=False, default="verification")
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    otp_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    granted_at: Mapped[datetime | None] = mapped_column(DateTime)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    verifier_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    consent_id: Mapped[int] = mapped_column(
        ForeignKey("consents.id", ondelete="CASCADE"), nullable=False
    )
    result: Mapped[str] = mapped_column(String(20), nullable=False, default="VERIFIED")
    signature: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("idx_audit_action", "action"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer)  # plain id, no FK (kept for history)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    resource: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    resource_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    ip: Mapped[str] = mapped_column(String(45), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"
    __table_args__ = (Index("uq_users_email", "email", unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False)
    institution_id: Mapped[int | None] = mapped_column(
        ForeignKey("institutions.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    institution: Mapped["Institution | None"] = relationship(back_populates="users")


class APAARRecord(Base):
    """Synthetic national APAAR registry — used by MockAPAARClient (backend_guide.md §6.3)."""

    __tablename__ = "apaar_registry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    apaar_id: Mapped[str] = mapped_column(String(12), nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    dob: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
