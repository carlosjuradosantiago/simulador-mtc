from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
QUESTIONS_PATH = ROOT / "data" / "mtc_extracted" / "questions_deduped.json"
STATE_PATH = ROOT / "data" / "mtc_extracted" / "import_edge_state.json"
OUTPUT_PATH = ROOT / "supabase" / "migrations" / "20260604130000_fill_mtc_question_explanations.sql"


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def trim_sentence(value: str, limit: int = 260) -> str:
    value = clean_text(value)
    if len(value) <= limit:
        return value
    trimmed = value[:limit].rsplit(" ", 1)[0].rstrip(" ,;:.")
    return f"{trimmed}..."


def with_period(value: str) -> str:
    value = clean_text(value)
    if not value:
        return ""
    return value if value.endswith((".", "!", "?", ":", ";")) else f"{value}."


def context_sentence(question_text: str, answer_text: str) -> str:
    question = question_text.lower()
    answer = answer_text.lower()

    if "todas" in answer and "correct" in answer:
        return "La pregunta reúne varias condiciones válidas; por eso no conviene escoger solo una parte de la regla."
    if "ninguna" in answer and "correct" in answer:
        return "Las demás opciones no describen correctamente la regla o la conducta exigida para este caso."
    if "a y b" in answer or "b y c" in answer or "a y c" in answer or "ambas" in answer:
        return "La alternativa correcta combina las afirmaciones que sí cumplen la norma; las restantes dejan fuera una condición importante."
    if "señal" in question or "gráfico" in question or "grafico" in question:
        return "En señales y gráficos, lo importante es identificar la orden, prohibición o advertencia exacta que transmite el símbolo."
    if "semáforo" in question or "semaforo" in question:
        return "El semáforo regula la prioridad de paso; la respuesta correcta indica la conducta segura antes de ingresar a la intersección."
    if "prohib" in question or "permit" in question:
        return "La norma distingue claramente lo permitido de lo prohibido; esta opción respeta ese límite y evita una maniobra sancionable o insegura."
    if "infracci" in question or "sanci" in question or "multa" in question:
        return "La sanción se asocia a la conducta descrita por la norma; por eso esta alternativa identifica la consecuencia aplicable."
    if "inspección técnica" in question or "revision técnica" in question or "revisión técnica" in question:
        return "La inspección técnica depende del tipo de vehículo y su antigüedad; esta opción ubica correctamente el momento exigido."
    if "licencia" in question or "categoría" in question or "categoria" in question:
        return "Cada categoría de licencia habilita vehículos y servicios específicos; esta opción coincide con ese alcance."
    if "velocidad" in question or "carril" in question or "adelant" in question or "intersección" in question or "interseccion" in question:
        return "En circulación, la prioridad es anticipar riesgos y mantener una maniobra ordenada, visible y permitida."
    if "accidente" in question or "siniestro" in question or "primeros auxilios" in question:
        return "Ante un incidente, la conducta correcta protege la vida, asegura la zona y evita agravar el riesgo."
    return "Esta alternativa expresa la regla aplicable al caso y descarta opciones incompletas, inseguras o contrarias a la norma."


def build_explanation(question: dict[str, Any]) -> str:
    question_text = clean_text(question.get("text"))
    answer = next((option for option in question.get("options", []) if option.get("is_correct")), None)
    answer_text = clean_text(answer.get("text") if answer else question.get("answer"))
    topic = clean_text(question.get("tema"))
    foundation = clean_text(question.get("fundamento"))

    parts = [
        f"Respuesta correcta: {with_period(trim_sentence(answer_text, 220))}",
        context_sentence(question_text, answer_text),
    ]

    if topic:
        parts.append(f"Repásalo dentro del tema: {with_period(trim_sentence(topic, 120))}")
    if foundation:
        parts.append(f"Sustento: {with_period(trim_sentence(foundation, 220))}")

    return clean_text(" ".join(parts))


def main() -> int:
    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    imported = {int(key): int(value) for key, value in state["imported"].items()}

    if len(questions) != len(imported):
      raise SystemExit(f"Cantidad inconsistente: {len(questions)} preguntas vs {len(imported)} ids importados")

    updates: list[tuple[int, str]] = []
    preview: list[dict[str, Any]] = []

    for index, question in enumerate(questions, start=1):
        question_id = imported[index]
        explanation = build_explanation(question)
        updates.append((question_id, explanation))
        if len(preview) < 8:
            preview.append({
                "id": question_id,
                "numero_pdf": question.get("numero_pdf"),
                "pregunta": clean_text(question.get("text")),
                "explicacion": explanation,
            })

    values = ",\n".join(
        f"  ({question_id}, {sql_literal(explanation)})"
        for question_id, explanation in updates
    )
    ids = ", ".join(str(question_id) for question_id, _ in updates)

    sql = f"""-- Generated by tools/mtc_import/generate_explanation_updates.py
-- Adds short didactic explanations to the active official MTC question bank.

with explanation_updates(id, explicacion) as (
values
{values}
)
update public.pregunta as p
set explicacion = u.explicacion
from explanation_updates as u
where p.id = u.id
  and p.id in ({ids});
"""

    OUTPUT_PATH.write_text(sql, encoding="utf-8")
    print(json.dumps({
        "output": str(OUTPUT_PATH),
        "updates": len(updates),
        "preview": preview,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
