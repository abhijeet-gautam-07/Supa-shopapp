"use client";

import { useState } from 'react';
import Link from 'next/link';
import { signout } from '../auth/actions';
import { addToCart, removeFromCart, checkout, getCart } from './actions'; 

// --- Shared Types ---
export interface Product {
  i_id: number;
  product_name: string;
  price: number;
  image_url: string;
  category: string;
}

export interface CartItem extends Product {
  quantity: number;
  cart_item_id: number; 
}

interface ShopProps {
  initialUser: any;
  initialProducts: Product[];
  initialCart: CartItem[];
}

export default function ShopUI({ initialUser, initialProducts, initialCart }: ShopProps) {
  // --- State ---
  const [user] = useState(initialUser); 
  const [products] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  
  const [loading, setLoading] = useState(false); 
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  // --- Filter State ---
  const [activeCategory, setActiveCategory] = useState<string>('Electronics');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(500);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const categories = ['Electronics', 'Shoes', 'Cloths', 'Toys'];

  // --- Filter Logic ---
  const filteredProducts = products
    .filter((product) => {
      // 1. Category Match
      if (product.category !== activeCategory) return false;
      // 2. Search Match
      if (!product.product_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // 3. Price Match
      if (product.price > maxPrice) return false;
      return true;
    })
    .sort((a, b) => {
      // 4. Sorting
      return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
    });

  // --- Helper: Refresh Cart Data ---
  const refreshCart = async () => {
    const updatedCart = await getCart();
    setCart(updatedCart as unknown as CartItem[]);
  };

  // --- Handlers ---
  const handleAdd = async (product: Product) => {
    setLoading(true);
    await addToCart(product.i_id);
    await refreshCart();
    setLoading(false);
  };

  const handleRemove = async (cartItemId: number) => {
    setLoading(true);
    await removeFromCart(cartItemId);
    await refreshCart();
    setLoading(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    await checkout();
    await refreshCart(); 
    setCheckoutMessage("Order placed successfully!");
    setLoading(false);
    setTimeout(() => setCheckoutMessage(null), 3000);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-slate-800">
      
      {/* NAVBAR */}
      <nav className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">Store</h1>
          
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* AUTH TOGGLE */}
          <div>
            {user ? (
              <form action={signout}>
                <button 
                  type="submit" 
                  className="text-sm font-medium text-red-500 hover:bg-red-50 px-3 py-2 rounded transition-colors"
                >
                  Sign Out
                </button>
              </form>
            ) : (
              <Link 
                href="/login" 
                className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Checkout Toast */}
      {checkoutMessage && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">
          {checkoutMessage}
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 max-w-7xl mx-auto w-full p-4 gap-6">
        
        {/* LEFT SIDEBAR (FILTERS & CART) */}
        <aside className="w-full md:w-1/4 flex flex-col gap-6 h-fit md:sticky md:top-24">
          
          {/* 1. FILTER PANEL */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-lg mb-4 text-gray-800">Filters</h2>
            
            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-1">Search Product</label>
              <input
                type="text"
                placeholder="e.g. Headphones"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <label className="block text-sm text-gray-500 mb-1">Max Price: ${maxPrice}</label>
              <input
                type="range"
                min="0"
                max="2000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Sort Toggle */}
            <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm text-gray-500 mb-2">Sort by Price</label>
                <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                        sortOrder === 'asc' 
                        ? 'bg-blue-50 text-blue-600 border-blue-200' 
                        : 'bg-orange-50 text-orange-600 border-orange-200'
                    }`}
                >
                    {sortOrder === 'asc' ? '⬆ Low to High' : '⬇ High to Low'}
                </button>
            </div>
          </div>

          {/* 2. CART PANEL */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-lg mb-4 border-b pb-2 text-gray-800">Your Cart</h2>
            
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Cart is empty</p>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.cart_item_id} className="flex justify-between items-center text-sm group">
                    <div>
                      <p className="font-medium text-gray-700">{item.product_name}</p>
                      <p className="text-xs text-gray-500">${item.price} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
                        <button 
                        onClick={() => handleRemove(item.cart_item_id)}
                        disabled={loading}
                        className="text-gray-400 hover:text-red-500 transition-colors px-1"
                        >
                        &times;
                        </button>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                
                <button 
                    className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                    onClick={handleCheckout}
                    disabled={loading}
                >
                    {loading ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* PRODUCTS GRID */}
        <main className="flex-1">
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold capitalize text-gray-800">{activeCategory} Products</h2>
              <span className="text-sm text-gray-500">{filteredProducts.length} items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div key={product.i_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col hover:shadow-md transition">
                  <div className="h-40 bg-gray-100 mb-4 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden relative">
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
                    ) : (
                        <span>No Image</span>
                    )}
                  </div>
                  <h3 className="font-bold mb-1 text-gray-800">{product.product_name}</h3>
                  <div className="mt-auto flex justify-between items-center">
                    <span className="text-lg font-bold text-blue-600">${product.price}</span>
                    <button
                      onClick={() => handleAdd(product)}
                      disabled={loading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Add +
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-10 text-gray-500">
                No products found matching your filters.
              </div>
            )}
          </div>
        </main>

      </div>
    </div>
  );
}