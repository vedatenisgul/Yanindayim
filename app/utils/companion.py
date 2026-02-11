"""Companion mode utilities — format notification messages."""


def format_companion_message(user_name: str, guide_title: str, step_number: int, frustration_count: int) -> str:
    """Generate a human-friendly notification message for the trusted contact."""
    return (
        f"{user_name}, \"{guide_title}\" rehberinin {step_number}. adımında "
        f"zorlanıyor ve {frustration_count} kez yardım istedi. "
        f"Lütfen kendisine destek olun."
    )
