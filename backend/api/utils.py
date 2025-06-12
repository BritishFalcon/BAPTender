from datetime import date


def calculate_age(dob: date, today: date | None = None) -> int:
    """Return age in full years given a date of birth."""
    if today is None:
        today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
