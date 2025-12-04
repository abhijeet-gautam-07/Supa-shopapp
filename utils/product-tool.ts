import { createClient } from '@supabase/supabase-js';

// Use Service Role Key to bypass RLS for the bot search (optional, or use Anon key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export type ProductSearchParams = {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'asc' | 'desc';
};

export async function searchProductsTool(params: ProductSearchParams) {
  console.log(" AI Executing Tool with:", params);

  let queryBuilder = supabase.from('product').select('*');

  // 1. Text Search
  if (params.query) {
    queryBuilder = queryBuilder.ilike('product_name', `%${params.query}%`);
  }

  // 2. Category Filter
  if (params.category) {
    // Ensure capitalization matches your DB constraints (Electronics, Shoes, etc)
    const formattedCategory = params.category.charAt(0).toUpperCase() + params.category.slice(1).toLowerCase();
    queryBuilder = queryBuilder.eq('category', formattedCategory);
  }

  // 3. Price Filters
  if (params.minPrice !== undefined) {
    queryBuilder = queryBuilder.gte('price', params.minPrice);
  }
  if (params.maxPrice !== undefined) {
    queryBuilder = queryBuilder.lte('price', params.maxPrice);
  }

  // 4. Sorting
  if (params.sort) {
    queryBuilder = queryBuilder.order('price', { ascending: params.sort === 'asc' });
  } else {
    // Default sort by relevancy (or ID)
    queryBuilder = queryBuilder.order('i_id', { ascending: true });
  }

  const { data, error } = await queryBuilder.limit(5); // Limit results for token efficiency

  if (error) {
    console.error("Supabase Tool Error:", error);
    return [];
  }

  // Convert BigInt to number to prevent serialization issues
  return data.map((p) => ({
    ...p,
    i_id: Number(p.i_id),
    price: Number(p.price)
  }));
}