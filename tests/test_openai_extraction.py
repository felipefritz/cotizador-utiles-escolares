#!/usr/bin/env python3
"""
Script de prueba para verificar la extracción con OpenAI.
Permite probar tanto con texto como con visión.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Verificar configuración
def check_config():
    """Verifica que el LLM esté configurado correctamente"""
    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    
    print("=" * 60)
    print("🔍 CONFIGURACIÓN DE LLM")
    print("=" * 60)
    
    print(f"📡 Proveedor: {provider.upper()}")
    
    if provider == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        vision_model = os.getenv("GROQ_VISION_MODEL", "llama-3.2-90b-vision-preview")
        
        if not api_key:
            print("❌ GROQ_API_KEY no está configurada")
            print()
            print("🚀 Groq es GRATIS y perfecto para producción")
            print("   Configúrala ejecutando:")
            print("   python setup_groq.py")
            print()
            print("   O manualmente en .env:")
            print("   1. Ve a https://console.groq.com/keys")
            print("   2. Crea tu API key (gratis)")
            print("   3. Agrégala en .env: GROQ_API_KEY=gsk_...")
            return False
        
        print(f"✅ GROQ_API_KEY: {'*' * 20}{api_key[-8:]}")
        print(f"✅ GROQ_MODEL: {model}")
        print(f"✅ GROQ_VISION_MODEL: {vision_model}")
        print(f"💚 Groq es 100% GRATIS - Sin límites de crédito")
    else:
        api_key = os.getenv("OPENAI_API_KEY")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        vision_model = os.getenv("OPENAI_VISION_MODEL", "gpt-4o")
        
        if not api_key:
            print("❌ OPENAI_API_KEY no está configurada")
            print("   Configúrala en el archivo .env")
            return False
        
        print(f"✅ OPENAI_API_KEY: {'*' * 20}{api_key[-8:]}")
        print(f"✅ OPENAI_MODEL: {model}")
        print(f"✅ OPENAI_VISION_MODEL: {vision_model}")
    
    print()
    return True


def test_text_extraction(text_sample: str):
    """Prueba la extracción con texto simple"""
    from app.llm_client import call_llm_full_extraction
    
    print("=" * 60)
    print("🤖 PRUEBA DE EXTRACCIÓN CON TEXTO")
    print("=" * 60)
    print(f"Texto de entrada:\n{text_sample}\n")
    
    try:
        result = call_llm_full_extraction(text_sample)
        
        print(f"✅ Extracción exitosa")
        print(f"📚 Curso: {result.get('curso', 'No especificado')}")
        print(f"📝 Items encontrados: {len(result.get('items', []))}")
        print()
        
        for i, item in enumerate(result.get('items', []), 1):
            print(f"{i}. {item.get('cantidad')} x {item.get('detalle')}")
            if item.get('asignatura'):
                print(f"   Asignatura: {item.get('asignatura')}")
            print(f"   Confianza: {item.get('confianza', 0):.2f}")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_vision_extraction(pdf_path: Path):
    """Prueba la extracción con visión en PDF"""
    from app.llm_client import call_llm_with_vision
    
    print("=" * 60)
    print("👁️  PRUEBA DE EXTRACCIÓN CON VISIÓN")
    print("=" * 60)
    print(f"Archivo: {pdf_path}")
    
    if not pdf_path.exists():
        print(f"❌ Archivo no encontrado: {pdf_path}")
        return False
    
    try:
        result = call_llm_with_vision(pdf_path)
        
        print(f"✅ Extracción exitosa")
        print(f"📚 Curso: {result.get('curso', 'No especificado')}")
        print(f"📝 Items encontrados: {len(result.get('items', []))}")
        print()
        
        for i, item in enumerate(result.get('items', []), 1):
            print(f"{i}. {item.get('cantidad')} x {item.get('detalle')}")
            if item.get('asignatura'):
                print(f"   Asignatura: {item.get('asignatura')}")
            print(f"   Confianza: {item.get('confianza', 0):.2f}")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Ejecuta las pruebas"""
    
    if not check_config():
        sys.exit(1)
    
    # Texto de ejemplo
    sample_text = """
    LISTA DE ÚTILES ESCOLARES - 3° BÁSICO
    
    LENGUAJE:
    - 3 Cuadernos universitarios 100 hojas
    - 2 Lápices grafito
    - 1 Goma de borrar
    - 1 Set de lápices de colores (12 colores)
    
    MATEMÁTICA:
    - 2 Cuadernos cuadriculados 100 hojas
    - 1 Regla de 30 cm
    - 1 Compás escolar
    
    ARTE:
    - 1 Block de dibujo 20 hojas
    - 1 Set de témperas (6 colores)
    - 3 Pinceles variados
    """
    
    # Prueba 1: Extracción con texto
    success_text = test_text_extraction(sample_text)
    
    # Prueba 2: Extracción con visión (si hay un PDF en uploads)
    uploads_dir = Path("uploads")
    pdf_files = list(uploads_dir.glob("*.pdf")) if uploads_dir.exists() else []
    
    if pdf_files:
        print("\n" + "=" * 60)
        print(f"📁 Encontrados {len(pdf_files)} PDFs en uploads/")
        print("=" * 60)
        
        # Probar con el primer PDF
        success_vision = test_vision_extraction(pdf_files[0])
    else:
        print("\n⚠️  No hay archivos PDF en uploads/ para probar visión")
        print("   Coloca un PDF con lista de útiles en uploads/ para probarlo")
        success_vision = None
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS")
    print("=" * 60)
    print(f"Extracción con texto: {'✅ OK' if success_text else '❌ FALLÓ'}")
    if success_vision is not None:
        print(f"Extracción con visión: {'✅ OK' if success_vision else '❌ FALLÓ'}")
    else:
        print(f"Extracción con visión: ⏭️  OMITIDA (sin archivos PDF)")
    print()


if __name__ == "__main__":
    main()
