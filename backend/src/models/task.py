from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict  # FIX: Import ConfigDict


class TaskBase(BaseModel):
    text: str
    completed: bool = False


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None


class Task(TaskBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    # FIX: Use model_config instead of class Config
    model_config = ConfigDict(from_attributes=True)
