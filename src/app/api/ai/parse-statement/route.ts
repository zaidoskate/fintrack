import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `
Eres un asistente experto en finanzas de la app "Fintrack". 
Tu objetivo es analizar estados de cuenta (PDFs) o capturas de pantalla de aplicaciones bancarias y extraer los movimientos financieros de manera precisa.

Extraerás la información en formato JSON estricto con la siguiente estructura:
{
  "movimientos": [
    {
      "tipo": "Gasto" | "Ingreso",
      "monto": 0.0,
      "comercio": "",
      "fecha": "YYYY-MM-DD"
    }
  ],
  "msi": [
    {
      "comercio": "",
      "monto_total": 0.0,
      "meses_totales": 0,
      "meses_restantes": 0,
      "mensualidad": 0.0,
      "fecha": "YYYY-MM-DD"
    }
  ]
}

Reglas importantes:
- Si detectas una compra a "Meses Sin Intereses" (MSI) o parcialidades, clasifícala SÓLO en la sección "msi", y NO en "movimientos".
- Si en un estado de cuenta aparece el cobro de la mensualidad (ej: "Pago 3 de 12 Liverpool $500"), DEBES reconstruir la compra original y ponerla en "msi" con meses_totales = 12, meses_restantes = 12 - 3 = 9, mensualidad = 500, monto_total = 12 * 500 = 6000. NO lo pongas en "movimientos".
- Los gastos corrientes normales van en "movimientos" con tipo "Gasto".
- Pagos a la tarjeta o abonos van en "movimientos" con tipo "Ingreso".
- Limpia los nombres de comercios para que sean bonitos (ej: "COMPRA LIVERPOOL POLANCO" -> "Liverpool", "UBER   TRIP" -> "Uber").
- Si no sabes el día exacto de la compra, adivina un día cercano dentro del mes del documento (ej: "2023-10-01").
`;

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'API Key de Gemini no configurada' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const mimeType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.7-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
      "Por favor extrae todos los movimientos y compras a MSI de este documento."
    ]);

    const text = result.response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('Error parseando JSON de Gemini:', text);
      throw new Error('La IA no devolvió un JSON válido');
    }

    return NextResponse.json(json);
  } catch (error: unknown) {
    console.error('Error en parse-statement:', error);
    const msg = error instanceof Error ? error.message : 'Error interno procesando el documento con IA';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
