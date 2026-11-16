"""Shared provenance checks for teacher emphasis and classroom questions.

These checks establish an exact, attributable quotation. Whether the wording
actually emphasizes a concept or invites an answer still requires source review.
"""


def normalize_whitespace(text):
    """Collapse whitespace only; preserve wording, punctuation and case."""
    return ' '.join(text.split())


def validate_teacher_evidence(entry, sources):
    """Require evidence for teacher entries and validate every supplied quote.

    Explicit exam/preparation entries may also retain teacher evidence without
    changing their primary category. Other entries do not require this field.
    Raises ValueError with the entry and evidence location on invalid input.
    """
    eid = entry.get('id', '<missing id>')
    evidence = entry.get('teacherEvidence', [])
    if not isinstance(evidence, list):
        raise ValueError(f'{eid}: teacherEvidence must be a list')
    if entry.get('category') == 'teacher' and not evidence:
        raise ValueError(f'{eid}: teacher category requires teacherEvidence')
    if not evidence:
        return 0
    listed_sources = entry.get('sourceIds', [])
    if not isinstance(listed_sources, list):
        raise ValueError(f'{eid}: sourceIds must be a list')
    for index, proof in enumerate(evidence):
        location = f'{eid}: teacherEvidence[{index}]'
        if not isinstance(proof, dict):
            raise ValueError(f'{location} must be an object')
        if proof.get('kind') not in ('emphasis', 'question'):
            raise ValueError(f'{location}: kind must be emphasis or question')
        sid = proof.get('sourceId')
        if not isinstance(sid, str) or not sid or sid not in sources:
            raise ValueError(f'{location}: unknown sourceId {sid!r}')
        if sid not in listed_sources:
            raise ValueError(f'{location}: {sid} must also appear in entry.sourceIds')
        quote = proof.get('quote')
        if not isinstance(quote, str) or not normalize_whitespace(quote):
            raise ValueError(f'{location}: quote must be nonempty text')
        source = sources[sid]
        excerpt = source.get('excerpt') if isinstance(source, dict) else None
        if not isinstance(excerpt, str) or not normalize_whitespace(excerpt):
            raise ValueError(f'{location}: source {sid} has no excerpt')
        if normalize_whitespace(quote) not in normalize_whitespace(excerpt):
            raise ValueError(f'{location}: quote is not a whitespace-normalized substring of {sid}')
    return len(evidence)
