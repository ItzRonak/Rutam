import re

def sanitize_text_input(input_text: str) -> str:
    """
    Security Mitigation 2: Strip control characters and detect prompt-injection attempts
    before passing to LLM layers.
    """
    if not isinstance(input_text, str):
        return ""
        
    # Remove control characters except standard whitespace
    sanitized = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', input_text)
    
    # Basic injection pattern detection
    injection_patterns = ["ignore previous instructions", "system prompt", "forget rules"]
    lower_text = sanitized.lower()
    
    for pattern in injection_patterns:
        if pattern in lower_text:
            raise ValueError(f"Potential prompt injection detected: matched '{pattern}'")
            
    return sanitized
