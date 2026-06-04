import { getSupabaseClient } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
export async function handleGetCategories(_req, examTypeId) {
  try {
    console.log('Getting categories for exam type:', examTypeId);
    const supabase = getSupabaseClient();
    // Get categories for exam type - using the Spanish table 'categoria'
    const { data: categories, error } = await supabase.from('categoria').select('id, nombre, descripcion, estado').eq('id_tipo_examen', parseInt(examTypeId)).eq('estado', 1).is('id_padre', null).order('nombre');
    if (error) {
      console.error('Error fetching categories:', error);
      return errorResponse(`Error al obtener categorías: ${error.message}`, 500);
    }
    console.log('Found categories:', categories?.length || 0);
    // Map to DTO format
    const categoryDtos = (categories || []).map((cat)=>({
        id: cat.id,
        name: cat.nombre,
        description: cat.descripcion
      }));
    return jsonResponse(categoryDtos);
  } catch (err) {
    console.error('Categories error:', err);
    return errorResponse(`Error interno del servidor: ${String(err)}`, 500);
  }
}
