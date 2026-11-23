from uuid import UUID
from datetime import datetime, date
from typing import Literal, Optional, List
from pydantic import BaseModel, EmailStr, Field

CategoryEnum = Literal[
    "Electronics",
    "Bags",
    "Wallets & IDs",
    "Books & Notes",
    "Keys",
    "Bottles & Accessories",
    "Other",
]


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ItemPublicOut(BaseModel):
    id: UUID
    reporter_id: UUID
    report_type: Literal["lost", "found"]
    title: str
    description: str
    category: str
    location: str
    event_date: date
    image_url: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedItemsOut(BaseModel):
    total: int
    page: int
    limit: int
    items: List[ItemPublicOut]


class ItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=120)
    description: Optional[str] = Field(None, min_length=5)
    category: Optional[CategoryEnum] = None
    location: Optional[str] = Field(None, min_length=2, max_length=100)
    event_date: Optional[date] = None
    status: Optional[Literal["open", "under_review", "resolved"]] = None
    hidden_details: Optional[str] = None


class ClaimCreate(BaseModel):
    item_id: UUID
    proof_description: str = Field(..., min_length=10)


class ClaimOut(BaseModel):
    id: UUID
    item_id: UUID
    claimant_id: UUID
    proof_description: str
    status: str
    admin_notes: Optional[str]
    created_at: datetime
    item: Optional[ItemPublicOut] = None

    class Config:
        from_attributes = True


class AdminClaimOut(ClaimOut):
    item_title: str
    item_image_url: Optional[str]
    item_hidden_details: Optional[str]
    claimant_name: str
    claimant_email: str


class AdminClaimDecision(BaseModel):
    status: Literal["approved", "rejected"]
    admin_notes: Optional[str] = None


class MatchOut(BaseModel):
    id: UUID
    lost_item: ItemPublicOut
    found_item: ItemPublicOut
    image_score: Optional[float]
    text_score: float
    combined_score: float
    is_dismissed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: UUID
    item_id: Optional[UUID]
    type: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
