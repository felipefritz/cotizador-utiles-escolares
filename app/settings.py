from typing import Any

from app.database import AppSetting


def get_setting_value(db, key: str, default: Any = None) -> Any:
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not setting:
        return default
    return setting.value


def get_setting_bool(db, key: str, default: bool = False) -> bool:
    value = get_setting_value(db, key, default)
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y", "on"}:
            return True
        if normalized in {"false", "0", "no", "n", "off"}:
            return False
    return bool(default)


def set_setting_bool(db, key: str, value: bool) -> bool:
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not setting:
        setting = AppSetting(key=key, value=bool(value))
        db.add(setting)
    else:
        setting.value = bool(value)
    db.commit()
    return bool(value)
