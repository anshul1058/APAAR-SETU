"""Student endpoints (backend_guide.md §5): bulk JSON add + scoped listing."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import audit
from app.auth.rbac import require_roles
from app.db import get_db
from app.models import Course, Institution, Student
from app.schemas import StudentOut

router = APIRouter(prefix="/students", tags=["students"])


class StudentIn(BaseModel):
    apaar_id: str = Field(min_length=1, max_length=12)
    course_id: int
    full_name: str
    student_code: str = ""
    dob: str | None = None
    gender: str = ""
    category: str = "GENERAL"
    quota_type: str = "regular"
    nationality: str = "INDIAN"
    admission_date: str | None = None


class StudentBulkIn(BaseModel):
    students: list[StudentIn]


def _mask_apaar(apaar: str | None) -> str:
    if not apaar:  # passport-only student (nri/oci/fn) — nothing to mask
        return "XXXXXXXX"
    return "XXXXXXXX" + apaar[-4:] if len(apaar) >= 4 else "XXXXXXXX"


def _mask_name(name: str) -> str:
    parts = name.split()
    return " ".join(p[0] + "." for p in parts if p) if parts else ""


@router.post("")
def upsert_students(
    payload: StudentBulkIn,
    request: Request = None,
    user: dict = Depends(require_roles("institution_admin")),
    db: Session = Depends(get_db),
):
    """Add or update students for YOUR institution (JSON bulk).

    Course ids must belong to your institution. Rows are inserted as
    'valid' only if the course exists; full rule validation happens on upload.
    """
    inst_id = user["institution_id"]
    added = updated = 0
    for s in payload.students:
        course = db.get(Course, s.course_id)
        if course is None or course.institution_id != inst_id:
            raise HTTPException(403, f"course_id {s.course_id} does not belong to your institution")
        student = db.execute(
            select(Student).where(
                Student.apaar_id == s.apaar_id,
                Student.institution_id == inst_id,
                Student.course_id == s.course_id,
            )
        ).scalar_one_or_none()
        if student is None:
            student = Student(apaar_id=s.apaar_id, institution_id=inst_id, course_id=s.course_id)
            db.add(student)
            added += 1
        else:
            updated += 1
        student.student_code = s.student_code
        student.full_name = s.full_name
        student.dob = s.dob
        student.gender = s.gender
        student.category = s.category.upper()
        student.quota_type = s.quota_type.lower()
        student.nationality = s.nationality
        student.admission_date = s.admission_date
        student.status = "valid"
    audit(db, user, "STUDENT_EDIT", "students", f"bulk:{added}+{updated}", request)
    db.commit()
    return {"added": added, "updated": updated}


@router.get("")
def list_students(
    q: str | None = Query(None, description="substring match on name or APAAR id"),
    course_id: int | None = None,
    user: dict = Depends(require_roles("institution_admin", "aicte_officer", "aicte_admin")),
    db: Session = Depends(get_db),
):
    """Search/list students.

    * institution_admin -> own institution, full records
    * aicte_*           -> ALL institutions, masked (system.md §6 privacy)
    """
    stmt = select(Student, Course, Institution).join(Course, Course.id == Student.course_id).join(
        Institution, Institution.id == Student.institution_id
    )
    if user["role"] == "institution_admin":
        stmt = stmt.where(Student.institution_id == user["institution_id"])
    if course_id:
        stmt = stmt.where(Student.course_id == course_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(Student.full_name.ilike(like) | Student.apaar_id.ilike(like))
    rows = db.execute(stmt.order_by(Student.id).limit(200)).all()

    if user["role"] == "institution_admin":
        return [
            {
                **StudentOut.model_validate(student).model_dump(),
                "course_name": course.name,
                "branch": course.branch,
                "institution_name": institution.name,
                "aicte_code": institution.aicte_code,
            }
            for student, course, institution in rows
        ]
    return [
        {
            "id": student.id,
            "apaar_id_masked": _mask_apaar(student.apaar_id),
            "full_name_masked": _mask_name(student.full_name),
            "institution_id": student.institution_id,
            "course_id": student.course_id,
            "category": student.category,
            "quota_type": student.quota_type,
            "status": student.status,
        }
        for student, _, _ in rows
    ]
