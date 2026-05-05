import { NextResponse } from 'next/server'
import { crearClienteAdmin } from '@/lib/supabaseAdmin'

const TAMAÑO_MAXIMO = 5 * 1024 * 1024 // 5MB
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const archivo = formData.get('imagen') as File | null

    if (!archivo) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      return NextResponse.json(
        { error: 'Tipo no permitido. Usá JPG, PNG, WebP o AVIF' },
        { status: 400 }
      )
    }

    if (archivo.size > TAMAÑO_MAXIMO) {
      return NextResponse.json({ error: 'La imagen no puede superar 5MB' }, { status: 400 })
    }

    const supabase = crearClienteAdmin()

    // Nombre único para evitar colisiones
    const ext = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = await archivo.arrayBuffer()

    const { data, error } = await supabase.storage
      .from('productos')
      .upload(nombre, buffer, {
        contentType: archivo.type,
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('productos')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (e: unknown) {
    const mensaje = e instanceof Error ? e.message : 'Error inesperado'
    return NextResponse.json({ error: mensaje }, { status: 500 })
  }
}
