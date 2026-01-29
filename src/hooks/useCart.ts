import { useState, useEffect } from 'react';

export interface CartItem {
    id: string;
    linkId?: string;
    name: string;
    price: number;
    image?: string;
    quantity: number;
    sellerId: string;
    sellerName: string;
}

export function useCart() {
    const [cart, setCart] = useState<CartItem[]>([]);

    useEffect(() => {
        const savedCart = localStorage.getItem('payloom_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error('Failed to parse cart');
            }
        }
    }, []);

    const saveCart = (newCart: CartItem[]) => {
        setCart(newCart);
        localStorage.setItem('payloom_cart', JSON.stringify(newCart));
    };

    const addToCart = (item: CartItem) => {
        const existing = cart.find(i => i.id === item.id);
        if (existing) {
            saveCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i));
        } else {
            saveCart([...cart, item]);
        }
    };

    const removeFromCart = (id: string) => {
        saveCart(cart.filter(i => i.id !== id));
    };

    const clearCart = () => {
        saveCart([]);
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return { cart, addToCart, removeFromCart, clearCart, total };
}
