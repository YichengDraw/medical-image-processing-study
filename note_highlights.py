"""Validate the single editorially selected sentence in each page note."""
import re


def sentences(paragraph):
    """Return exact sentence substrings; keep closing quotation marks attached."""
    return [match.group(0).strip() for match in re.finditer(
        r'.+?(?:[。！？]+[”’」』]*|[!?]+[”’\"]*(?=\s|$)|$)', paragraph, re.S
    ) if match.group(0).strip()]


def validate_key_sentence(note, label):
    chosen = note.get('keySentence')
    assert isinstance(chosen, dict), f'Missing key sentence: {label}'
    assert set(chosen) == {'paragraph', 'text'}, f'Invalid key sentence: {label}'
    index, text = chosen['paragraph'], chosen['text']
    paragraphs = note['paragraphs']
    assert type(index) is int and 0 <= index < len(paragraphs), f'Invalid key paragraph: {label}'
    assert isinstance(text, str) and text.strip() == text and text, f'Empty key sentence: {label}'
    assert text in sentences(paragraphs[index]), f'Highlight must be one complete existing sentence: {label}'
    assert paragraphs[index].count(text) == 1, f'Ambiguous key sentence: {label}'
