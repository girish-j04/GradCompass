"""
Ingest programs_clean.csv and program_stats.csv into the PostgreSQL database.

Usage (from the api/ directory):
    python scripts/ingest_university_data.py
"""
import asyncio
import os
import sys
import pandas as pd
import numpy as np

# Make sure the app package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database import AsyncSessionLocal, engine, Base
from app.models.matching import Program, ProgramStats

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "university_matcher")


def _clean(val):
    """Return None for obvious 'not available' strings, else the value."""
    if val is None:
        return None
    s = str(val).strip()
    if s.lower() in ("no information mentioned", "not mentioned", "nan", "none", ""):
        return None
    return s


def _float_or_none(val):
    cleaned = _clean(val)
    if cleaned is None:
        return None
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


async def ingest():
    programs_path = os.path.join(DATA_DIR, "programs_clean.csv")
    stats_path = os.path.join(DATA_DIR, "program_stats.csv")

    print(f"Loading {programs_path} ...")
    prog_df = pd.read_csv(programs_path)
    prog_df = prog_df.drop_duplicates(subset="program_id")

    print(f"Loading {stats_path} ...")
    stats_df = pd.read_csv(stats_path)
    stats_df = stats_df.drop_duplicates(subset="program_id")
    stats_lookup = stats_df.set_index("program_id").to_dict("index")

    async with AsyncSessionLocal() as db:
        # --- Programs ---
        print(f"Upserting {len(prog_df)} programs ...")
        for _, row in prog_df.iterrows():
            pid = str(row["program_id"])

            # Build program dict — map CSV columns to ORM columns
            prog_data = dict(
                program_id=pid,
                uni_name=str(row.get("uni_name", "")),
                type_of_degree=_clean(row.get("degree_norm")),    # raw degree string
                degree_norm=_clean(row.get("degree_norm")),        # normalised bucket
                course_name=_clean(row.get("course_norm")),        # raw course string
                course_norm=_clean(row.get("course_norm")),        # normalised for filtering
                global_rank_uni=_float_or_none(row.get("global_rank_uni")),
                tuition_fee_usd=_float_or_none(row.get("tuition_fee_usd")),
                living_expense=_float_or_none(row.get("living_expense")),
                uni_website_url=_clean(row.get("uni_website_url")),
            )

            stmt = (
                pg_insert(Program)
                .values(**prog_data)
                .on_conflict_do_update(
                    index_elements=["program_id"],
                    set_={
                        k: v for k, v in prog_data.items() if k != "program_id"
                    },
                )
            )
            await db.execute(stmt)

        await db.commit()
        print("Programs committed.")

        # --- ProgramStats ---
        print(f"Upserting {len(stats_df)} program stats ...")
        for pid, s in stats_lookup.items():
            stats_data = dict(
                program_id=str(pid),
                n_total=int(s.get("n_total", 0)),
                n_admit=int(s.get("n_admit", 0)),
                n_reject=int(s.get("n_reject", 0)),
                admit_rate_smoothed=float(s.get("admit_rate_smoothed", 0.5)),
            )

            stmt = (
                pg_insert(ProgramStats)
                .values(**stats_data)
                .on_conflict_do_update(
                    index_elements=["program_id"],
                    set_={k: v for k, v in stats_data.items() if k != "program_id"},
                )
            )
            await db.execute(stmt)

        await db.commit()
        print("Stats committed.")

    print("\nIngestion complete!")
    print(f"  Programs: {len(prog_df)}")
    print(f"  Stats:    {len(stats_df)}")


if __name__ == "__main__":
    asyncio.run(ingest())
