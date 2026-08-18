from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
PAYLOAD = ROOT / "data" / "mtc_extracted" / "questions_deduped.json"
DEFAULT_STATE = ROOT / "data" / "mtc_extracted" / "import_edge_state.json"
DEFAULT_API_BASE = "https://wazikdsfacrawhphzltn.supabase.co/functions/v1/api"
DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhemlrZHNmYWNyYXdocGh6bHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTk2OTIsImV4cCI6MjA3NTQzNTY5Mn0.--xoCk-6Xq0qmUYDDuatBTLOl2q1Nxns_85A4xaiDOU"
CATEGORY_IDS = [16, 17, 18, 19, 20, 22, 23, 24, 25]
TEXT_REPLACEMENTS = {
    "¿prohibido voltear a la izquierda¿": '"prohibido voltear a la izquierda"',
    "¿U¿": '"U"',
    "¿CEDA EL PASO?": '"CEDA EL PASO"',
    "nùmero": "número",
    "inspecciòn": "inspección",
    "contacatdo": "contactado",
}


def load_questions() -> list[dict[str, Any]]:
    if not PAYLOAD.exists():
        raise SystemExit(f"No existe {PAYLOAD}. Ejecuta primero extract_mtc_bank.py")
    return json.loads(PAYLOAD.read_text(encoding="utf-8"))


def without_import_index(row: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in row.items() if key != "_import_index"}


def clean_import_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value
    for source, target in TEXT_REPLACEMENTS.items():
        cleaned = cleaned.replace(source, target)
    return cleaned


def question_has_cleanup_change(question: dict[str, Any]) -> bool:
    fields = [question.get("text"), question.get("tema"), question.get("fundamento")]
    fields.extend(option.get("text") for option in question.get("options", []))
    return any(clean_import_text(value) != value for value in fields if value is not None)


def build_import_rows(questions: list[dict[str, Any]]) -> dict[str, Any]:
    question_rows = []
    option_rows = []
    question_media_rows = []
    relation_rows = []

    for index, question in enumerate(questions, start=1):
        options = question.get("options") or []
        if len(options) not in {3, 4}:
            raise ValueError(f"Pregunta {index}: se esperaban 3 o 4 alternativas oficiales.")
        if any(not option.get("text") and not option.get("media") for option in options):
            raise ValueError(f"Pregunta {index}: contiene una alternativa sin texto ni imagen.")
        if sum(bool(option.get("is_correct")) for option in options) != 1:
            raise ValueError(f"Pregunta {index}: debe tener exactamente una respuesta correcta.")
        sources = question.get("sources") or []
        first_source = sources[0] if sources else question
        source_class = first_source.get("clase") or first_source.get("source_code")
        fundamento = clean_import_text(question.get("fundamento") or None)
        question_rows.append({
            "_import_index": index,
            "id_tipo_examen": 2,
            "texto": clean_import_text(question["text"]),
            "tipo_pregunta": "multiple",
            "dificultad": 1,
            "tema": clean_import_text(question["tema"]),
            "tipo_seccion": question.get("tipo_seccion"),
            "clase": source_class,
            "numero_pdf": first_source.get("numero_pdf"),
            "fundamento": fundamento,
            "explicacion": fundamento,
        })
        for option in options:
            media = option["media"][0] if option.get("media") else None
            option_rows.append({
                "_import_index": index,
                "texto": clean_import_text(option["text"]),
                "es_correcta": bool(option["is_correct"]),
                "orden": option["order"],
                "tipo_multimedia": media["mime"] if media else None,
                "datos_multimedia": media["data_uri"] if media else None,
            })
        for order, media in enumerate(question.get("question_media") or [], start=1):
            question_media_rows.append({
                "_import_index": index,
                "tipo_multimedia": media["mime"],
                "datos": media["data_uri"],
                "orden": order,
                "descripcion": f"{question['source_code']} pregunta {question['numero_pdf']}",
            })
        for category_id in question.get("category_ids") or []:
            relation_rows.append({
                "_import_index": index,
                "id_categoria": category_id,
            })

    return {
        "questions": question_rows,
        "options": option_rows,
        "question_media": question_media_rows,
        "relations": relation_rows,
    }


class SupabaseRest:
    def __init__(self, url: str, key: str):
        self.base = url.rstrip("/") + "/rest/v1"
        self.key = key

    def request(self, method: str, path: str, body: Any | None = None, prefer: str | None = None) -> Any:
        payload = None if body is None else json.dumps(body).encode("utf-8")
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        req = urllib.request.Request(f"{self.base}{path}", data=payload, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                text = response.read().decode("utf-8")
                return json.loads(text) if text else None
        except urllib.error.HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {path} fallo: HTTP {error.code} {details}") from error


class EdgeApi:
    def __init__(self, api_base: str, token: str, anon_key: str):
        self.api_base = api_base.rstrip("/")
        self.token = token
        self.anon_key = anon_key

    def post(self, path: str, body: Any, timeout: int = 180) -> Any:
        payload = json.dumps(body).encode("utf-8")
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.anon_key}",
            "Content-Type": "application/json",
            "x-mtc-import-token": self.token,
        }
        req = urllib.request.Request(f"{self.api_base}{path}", data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                text = response.read().decode("utf-8")
                return json.loads(text) if text else None
        except urllib.error.HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"POST {path} fallo: HTTP {error.code} {details}") from error


def chunks(items: list[Any], size: int = 100):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def build_question_payloads(rows: dict[str, Any]) -> list[dict[str, Any]]:
    options_by_index: dict[int, list[dict[str, Any]]] = {}
    media_by_index: dict[int, list[dict[str, Any]]] = {}

    for option in rows["options"]:
        options_by_index.setdefault(option["_import_index"], []).append(without_import_index(option))

    for media in rows["question_media"]:
        media_by_index.setdefault(media["_import_index"], []).append(without_import_index(media))

    payloads = []
    for question in rows["questions"]:
        import_index = question["_import_index"]
        payloads.append({
            "importIndex": import_index,
            "question": without_import_index(question),
            "options": options_by_index.get(import_index, []),
            "questionMedia": media_by_index.get(import_index, []),
        })

    return payloads


def load_edge_state(path: Path, reset: bool) -> dict[int, int]:
    if reset or not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {int(key): int(value) for key, value in (raw.get("imported") or {}).items()}


def save_edge_state(path: Path, api_base: str, imported: dict[int, int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({
        "apiBase": api_base,
        "imported": {str(key): imported[key] for key in sorted(imported)},
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, ensure_ascii=False, indent=2), encoding="utf-8")


def apply_import(rows: dict[str, Any], categories: list[int]) -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.")

    client = SupabaseRest(url, key)
    import_to_db_id: dict[int, int] = {}

    print("Insertando preguntas nuevas...")
    for row in rows["questions"]:
        import_index = row["_import_index"]
        inserted = client.request("POST", "/pregunta?select=id", without_import_index(row), prefer="return=representation")
        import_to_db_id[import_index] = inserted[0]["id"]

    print("Insertando opciones...")
    option_rows = []
    for row in rows["options"]:
        clean = without_import_index(row)
        clean["id_pregunta"] = import_to_db_id[row["_import_index"]]
        option_rows.append(clean)
    for batch in chunks(option_rows):
        client.request("POST", "/opcion_pregunta", batch, prefer="return=minimal")

    print("Insertando multimedia de pregunta...")
    media_rows = []
    for row in rows["question_media"]:
        clean = without_import_index(row)
        clean["id_pregunta"] = import_to_db_id[row["_import_index"]]
        media_rows.append(clean)
    for batch in chunks(media_rows, 50):
        client.request("POST", "/multimedia_pregunta", batch, prefer="return=minimal")

    print("Reemplazando relaciones categoria_pregunta...")
    category_filter = ",".join(str(category_id) for category_id in categories)
    client.request("DELETE", f"/categoria_pregunta?id_categoria=in.({category_filter})", prefer="return=minimal")
    relation_rows = []
    for row in rows["relations"]:
        if row["id_categoria"] in categories:
            relation_rows.append({
                "id_categoria": row["id_categoria"],
                "id_pregunta": import_to_db_id[row["_import_index"]],
            })
    for batch in chunks(relation_rows):
        client.request("POST", "/categoria_pregunta", batch, prefer="return=minimal")

    print("Importacion aplicada.")


def apply_import_via_edge(
    rows: dict[str, Any],
    categories: list[int],
    api_base: str,
    token: str,
    anon_key: str,
    chunk_size: int,
    state_file: Path,
    reset_state: bool,
) -> None:
    client = EdgeApi(api_base, token, anon_key)
    payloads = build_question_payloads(rows)
    import_to_db_id = load_edge_state(state_file, reset_state)
    pending_payloads = [payload for payload in payloads if payload["importIndex"] not in import_to_db_id]

    print(f"Preguntas ya importadas en estado: {len(import_to_db_id)}")
    print(f"Preguntas pendientes por enviar: {len(pending_payloads)}")

    for index, batch in enumerate(chunks(pending_payloads, chunk_size), start=1):
        result = client.post("/admin/mtc-import/questions", {"questions": batch})
        for item in result.get("imported", []):
            import_to_db_id[int(item["importIndex"])] = int(item["id"])
        save_edge_state(state_file, api_base, import_to_db_id)
        print(f"Chunk {index}: importadas {len(batch)} preguntas; total estado {len(import_to_db_id)}")

    missing = [payload["importIndex"] for payload in payloads if payload["importIndex"] not in import_to_db_id]
    if missing:
        raise SystemExit(f"Faltan preguntas importadas: {missing[:20]}")

    relation_pairs = set()
    relation_rows = []
    for row in rows["relations"]:
        if row["id_categoria"] not in categories:
            continue
        pair = (row["id_categoria"], import_to_db_id[row["_import_index"]])
        if pair in relation_pairs:
            continue
        relation_pairs.add(pair)
        relation_rows.append({
            "id_categoria": pair[0],
            "id_pregunta": pair[1],
        })

    print(f"Finalizando relaciones oficiales: {len(relation_rows)}")
    result = client.post("/admin/mtc-import/finalize", {
        "categories": categories,
        "relations": relation_rows,
    }, timeout=240)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("Importacion por Edge Function aplicada.")


def update_cleanups_via_edge(
    rows: dict[str, Any],
    source_questions: list[dict[str, Any]],
    api_base: str,
    token: str,
    anon_key: str,
    chunk_size: int,
    state_file: Path,
) -> None:
    client = EdgeApi(api_base, token, anon_key)
    import_to_db_id = load_edge_state(state_file, reset=False)
    payload_by_index = {payload["importIndex"]: payload for payload in build_question_payloads(rows)}

    updates = []
    for index, question in enumerate(source_questions, start=1):
        if not question_has_cleanup_change(question):
            continue
        if index not in import_to_db_id:
            raise SystemExit(f"No hay id importado para _import_index {index}.")
        payload = payload_by_index[index]
        updates.append({
            "id": import_to_db_id[index],
            "question": payload["question"],
            "options": payload["options"],
        })

    print(f"Preguntas con limpieza de texto: {len(updates)}")
    for index, batch in enumerate(chunks(updates, chunk_size), start=1):
        result = client.post("/admin/mtc-import/update-questions", {"questions": batch})
        print(f"Chunk limpieza {index}: {json.dumps(result, ensure_ascii=False)}")

    print("Limpiezas de texto aplicadas.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Importa el banco oficial MTC extraido a Supabase.")
    parser.add_argument("--apply", action="store_true", help="Aplica cambios reales por REST directo con service key.")
    parser.add_argument("--apply-edge", action="store_true", help="Aplica cambios reales por Edge Function protegida.")
    parser.add_argument("--update-edge-cleanups", action="store_true", help="Actualiza textos limpiados en preguntas ya importadas por Edge.")
    parser.add_argument("--api-base", default=os.environ.get("MTC_IMPORT_API_BASE", DEFAULT_API_BASE), help="Base URL de la funcion api.")
    parser.add_argument("--token", default=os.environ.get("MTC_IMPORT_TOKEN"), help="Token temporal para la ruta de importacion.")
    parser.add_argument("--anon-key", default=os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY") or DEFAULT_ANON_KEY, help="Anon key requerida por el gateway de Edge Functions.")
    parser.add_argument("--chunk-size", type=int, default=8, help="Preguntas por request hacia Edge Function.")
    parser.add_argument("--state-file", type=Path, default=DEFAULT_STATE, help="Archivo local para reanudar la carga Edge.")
    parser.add_argument("--reset-state", action="store_true", help="Ignora el estado local previo de importacion Edge.")
    parser.add_argument(
        "--categories",
        default=",".join(str(category_id) for category_id in CATEGORY_IDS),
        help="IDs de categoria a reemplazar, separados por coma.",
    )
    args = parser.parse_args()

    categories = [int(value.strip()) for value in args.categories.split(",") if value.strip()]
    questions = load_questions()
    rows = build_import_rows(questions)
    category_counts: dict[int, int] = {}
    for row in rows["relations"]:
        category_counts[row["id_categoria"]] = category_counts.get(row["id_categoria"], 0) + 1

    mode = "update-edge-cleanups" if args.update_edge_cleanups else "apply-edge" if args.apply_edge else "apply" if args.apply else "dry-run"
    print(json.dumps({
        "mode": mode,
        "questions_to_insert": len(rows["questions"]),
        "options_to_insert": len(rows["options"]),
        "question_media_to_insert": len(rows["question_media"]),
        "category_relations_to_replace": sum(1 for row in rows["relations"] if row["id_categoria"] in categories),
        "category_counts": {str(key): category_counts[key] for key in sorted(category_counts)},
        "replace_categories": categories,
        "deletes_old_questions": False,
    }, ensure_ascii=False, indent=2))

    selected_modes = sum(1 for enabled in (args.apply, args.apply_edge, args.update_edge_cleanups) if enabled)
    if selected_modes > 1:
        raise SystemExit("Usa solo un modo de escritura a la vez.")

    if args.apply:
        apply_import(rows, categories)

    if args.apply_edge:
        if not args.token:
            raise SystemExit("Falta MTC_IMPORT_TOKEN o --token para --apply-edge.")
        if args.chunk_size < 1 or args.chunk_size > 20:
            raise SystemExit("--chunk-size debe estar entre 1 y 20.")
        apply_import_via_edge(
            rows,
            categories,
            args.api_base,
            args.token,
            args.anon_key,
            args.chunk_size,
            args.state_file,
            args.reset_state,
        )

    if args.update_edge_cleanups:
        if not args.token:
            raise SystemExit("Falta MTC_IMPORT_TOKEN o --token para --update-edge-cleanups.")
        if args.chunk_size < 1 or args.chunk_size > 50:
            raise SystemExit("--chunk-size debe estar entre 1 y 50.")
        update_cleanups_via_edge(
            rows,
            questions,
            args.api_base,
            args.token,
            args.anon_key,
            args.chunk_size,
            args.state_file,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
