import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';

// Load env variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// IMPORTANT: Use SERVICE_ROLE_KEY to bypass RLS policies during seeding
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CATEGORIES = ['Electronics', 'Shoes', 'Cloths', 'Toys'];

// Helper to get a realistic image based on category
const getImageByCategory = (category: string) => {
  switch (category) {
    case 'Electronics': return `https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=500&q=60`; // Gadget
    case 'Shoes': return `https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=60`; // Nike shoe
    case 'Cloths': return `https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=500&q=60`; // T-shirt
    case 'Toys': return `https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=500&q=60`; // Lego
    default: return 'https://via.placeholder.com/500';
  }
};

async function seedProducts() {
  console.log('🌱 Seeding products...');

  const products = [];

  for (let i = 0; i < 100; i++) {
    const category = faker.helpers.arrayElement(CATEGORIES);
    
    products.push({
      product_name: faker.commerce.productName(),
      price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
      category: category,
      // We append a random query param to the image URL so they don't all look identical in the browser cache
      image_url: `${getImageByCategory(category)}&random=${i}`, 
    });
  }

  const { error } = await supabase.from('product').insert(products);

  if (error) {
    console.error('❌ Error seeding data:', error);
  } else {
    console.log('✅ Successfully added 100 products!');
  }
}

seedProducts();
// ```

// **3. Run the Script**
// You need to use `ts-node` (if using TypeScript) or just `node` to run this.
// ```bash
// # If using TypeScript (install ts-node first: npm i -D ts-node)
// npx ts-node scripts/seed.ts
// ```

// ---

// ### Option 2: The SQL Generator (The "Quick Fix")
// If you don't want to write a script, you can generate a massive SQL query and run it directly in the Supabase SQL Editor.

// **Tool:** ChatGPT / Claude / Gemini

// **Prompt to use:**
// > "Generate a SQL INSERT statement for a PostgreSQL table named 'product' with 50 rows of dummy data.
// > The columns are: product_name (text), price (decimal), image_url (text), category (text).
// > Constraints: 'category' must be one of: 'Shoes', 'Toys', 'Electronics', 'Cloths'.
// > Make the product names realistic based on the category. Use placeholder image URLs."

// **Result:**
// The AI will give you a query like this:

// ```sql
// INSERT INTO public.product (product_name, price, category, image_url) VALUES
// ('Wireless Headphones', 99.99, 'Electronics', 'https://via.placeholder.com/300?text=Headphones'),
// ('Running Sneakers', 59.50, 'Shoes', 'https://via.placeholder.com/300?text=Shoes'),
// ('Cotton T-Shirt', 15.00, 'Cloths', 'https://via.placeholder.com/300?text=Shirt'),
// ('Action Figure', 25.00, 'Toys', 'https://via.placeholder.com/300?text=Toy'),
// -- ... 46 more lines ...
// ('Gaming Mouse', 45.00, 'Electronics', 'https://via.placeholder.com/300?text=Mouse');