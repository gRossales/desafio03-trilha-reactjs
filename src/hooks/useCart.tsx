import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const {data : stock}  = await api.get<Stock>(`/stock/${productId}`) ;
      let productInCart = cart.find(product => product.id === productId);
      
      const amount = (productInCart !== undefined) ? productInCart.amount + 1: 1;
      const newCart = cart.map(product=>{
        if(product.id !== productId){
          return product;
        }
        return {...product, amount};
      }); 

      if(!productInCart){
        const {data: product} = await api.get<Product>(`/products/${productId}`);
        productInCart = {...product, amount};
        newCart.push(productInCart);
      }

      if(amount  > stock.amount){
       toast.error('Quantidade solicitada fora de estoque');
       return;
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.find(product=>product.id === productId)){
        throw new Error();
      }

      const newCart = [...cart.filter(product=>product.id !== productId)];
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount<=0){
        return;
      }

      const productInCart = cart.find(product => product.id === productId);
      if(productInCart === undefined){
        throw new Error();
      }

      const newCart = cart.map(product=>{
        if(product.id !== productId){
          return product;
        }
        return {...product, amount};
      }); 
      
      const {data: stock} = await api.get<Stock>(`/stock/${productId}`);
      if(amount > stock.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return 
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
