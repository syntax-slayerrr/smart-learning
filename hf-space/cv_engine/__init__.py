"""
AI Classroom Intelligence — Edge CV Engine
===========================================
Version: 4.1.0 (Modular Multi-Developer Edition)
Syntax Slayer — Smart Learning Platform
"""

from cv_engine.config import KonfigurasiEngine, EngineConfig
from cv_engine.pipeline import jalankan_saluran_pipa_cv, run_pipeline

__version__ = "4.1.0"

__all__ = [
    # Bahasa Indonesia
    "KonfigurasiEngine",
    "jalankan_saluran_pipa_cv",
    # English Aliases
    "EngineConfig",
    "run_pipeline",
    "__version__"
]
