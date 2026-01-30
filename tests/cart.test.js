/**
 * Тесты для cart.js
 * @jest-environment jsdom
 */

// Мокаем глобальные зависимости
const localStorageMock = {
    store: {},
    getItem: jest.fn(key => localStorageMock.store[key] || null),
    setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
    removeItem: jest.fn(key => { delete localStorageMock.store[key]; }),
    clear: jest.fn(() => { localStorageMock.store = {}; })
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Мокаем CONFIG
global.CONFIG = {
    DELIVERY: {
        freeShippingThreshold: 2000,
        cost: 299
    }
};

// Мокаем telegramApp
global.telegramApp = {
    hapticFeedback: jest.fn()
};

// Мокаем document.getElementById для updateBadge
document.body.innerHTML = '<span id="cartBadge">0</span>';

// Загружаем Cart класс
const cartCode = `
class Cart {
    constructor() {
        this.items = [];
        this.load();
    }

    add(product, quantity = 1) {
        const existingItem = this.items.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: quantity
            });
        }

        this.save();
        this.updateBadge();
        telegramApp.hapticFeedback('success');
    }

    remove(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.save();
        this.updateBadge();
        telegramApp.hapticFeedback('light');
    }

    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity = quantity;
            this.save();
            this.updateBadge();
        }
    }

    getItems() {
        return this.items;
    }

    getCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getDeliveryCost() {
        const total = this.getTotal();
        return total >= CONFIG.DELIVERY.freeShippingThreshold ? 0 : CONFIG.DELIVERY.cost;
    }

    getFinalTotal() {
        return this.getTotal() + this.getDeliveryCost();
    }

    clear() {
        this.items = [];
        this.save();
        this.updateBadge();
    }

    save() {
        try {
            localStorage.setItem('cart', JSON.stringify(this.items));
        } catch (e) {
            console.error('Ошибка сохранения корзины:', e);
        }
    }

    load() {
        try {
            const saved = localStorage.getItem('cart');
            if (saved) {
                this.items = JSON.parse(saved);
                this.updateBadge();
            }
        } catch (e) {
            console.error('Ошибка загрузки корзины:', e);
            this.items = [];
        }
    }

    updateBadge() {
        const badge = document.getElementById('cartBadge');
        if (badge) {
            const count = this.getCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    isEmpty() {
        return this.items.length === 0;
    }
}
`;

eval(cartCode);

// Тестовые данные
const testProduct1 = {
    id: 'test-001',
    name: 'Тестовый товар 1',
    price: 1000,
    image: 'https://example.com/image1.jpg'
};

const testProduct2 = {
    id: 'test-002',
    name: 'Тестовый товар 2',
    price: 500,
    image: 'https://example.com/image2.jpg'
};

describe('Cart', () => {

    let cart;

    beforeEach(() => {
        // Очищаем localStorage перед каждым тестом
        localStorageMock.clear();
        localStorageMock.store = {};
        jest.clearAllMocks();

        // Создаем новый экземпляр корзины
        cart = new Cart();
    });

    describe('Инициализация', () => {

        test('должна создаваться с пустым массивом items', () => {
            expect(cart.items).toEqual([]);
        });

        test('должна загружать данные из localStorage', () => {
            const savedItems = [{ id: 'saved-001', quantity: 2 }];
            localStorageMock.store['cart'] = JSON.stringify(savedItems);

            const newCart = new Cart();
            expect(newCart.items).toEqual(savedItems);
        });

    });

    describe('add()', () => {

        test('должна добавлять новый товар', () => {
            cart.add(testProduct1, 1);

            expect(cart.items.length).toBe(1);
            expect(cart.items[0].id).toBe(testProduct1.id);
            expect(cart.items[0].quantity).toBe(1);
        });

        test('должна добавлять товар с указанным количеством', () => {
            cart.add(testProduct1, 5);

            expect(cart.items[0].quantity).toBe(5);
        });

        test('должна увеличивать количество существующего товара', () => {
            cart.add(testProduct1, 2);
            cart.add(testProduct1, 3);

            expect(cart.items.length).toBe(1);
            expect(cart.items[0].quantity).toBe(5);
        });

        test('должна добавлять разные товары отдельно', () => {
            cart.add(testProduct1, 1);
            cart.add(testProduct2, 2);

            expect(cart.items.length).toBe(2);
        });

        test('должна вызывать hapticFeedback', () => {
            cart.add(testProduct1, 1);
            expect(telegramApp.hapticFeedback).toHaveBeenCalledWith('success');
        });

        test('должна сохранять в localStorage', () => {
            cart.add(testProduct1, 1);
            expect(localStorage.setItem).toHaveBeenCalled();
        });

    });

    describe('remove()', () => {

        test('должна удалять товар по ID', () => {
            cart.add(testProduct1, 1);
            cart.add(testProduct2, 1);

            cart.remove(testProduct1.id);

            expect(cart.items.length).toBe(1);
            expect(cart.items[0].id).toBe(testProduct2.id);
        });

        test('не должна ломаться при удалении несуществующего товара', () => {
            cart.add(testProduct1, 1);
            cart.remove('non-existent-id');

            expect(cart.items.length).toBe(1);
        });

        test('должна вызывать hapticFeedback', () => {
            cart.add(testProduct1, 1);
            cart.remove(testProduct1.id);

            expect(telegramApp.hapticFeedback).toHaveBeenCalledWith('light');
        });

    });

    describe('updateQuantity()', () => {

        test('должна обновлять количество товара', () => {
            cart.add(testProduct1, 1);
            cart.updateQuantity(testProduct1.id, 10);

            expect(cart.items[0].quantity).toBe(10);
        });

        test('не должна ломаться при обновлении несуществующего товара', () => {
            cart.add(testProduct1, 1);
            cart.updateQuantity('non-existent-id', 10);

            expect(cart.items[0].quantity).toBe(1);
        });

    });

    describe('getItems()', () => {

        test('должна возвращать массив товаров', () => {
            cart.add(testProduct1, 1);
            cart.add(testProduct2, 2);

            const items = cart.getItems();

            expect(Array.isArray(items)).toBe(true);
            expect(items.length).toBe(2);
        });

        test('должна возвращать пустой массив для пустой корзины', () => {
            expect(cart.getItems()).toEqual([]);
        });

    });

    describe('getCount()', () => {

        test('должна возвращать 0 для пустой корзины', () => {
            expect(cart.getCount()).toBe(0);
        });

        test('должна возвращать общее количество товаров', () => {
            cart.add(testProduct1, 3);
            cart.add(testProduct2, 2);

            expect(cart.getCount()).toBe(5);
        });

    });

    describe('getTotal()', () => {

        test('должна возвращать 0 для пустой корзины', () => {
            expect(cart.getTotal()).toBe(0);
        });

        test('должна возвращать сумму товаров', () => {
            cart.add(testProduct1, 2); // 1000 * 2 = 2000
            cart.add(testProduct2, 3); // 500 * 3 = 1500

            expect(cart.getTotal()).toBe(3500);
        });

    });

    describe('getDeliveryCost()', () => {

        test('должна возвращать стоимость доставки для маленькой суммы', () => {
            cart.add(testProduct2, 1); // 500

            expect(cart.getDeliveryCost()).toBe(299);
        });

        test('должна возвращать 0 для суммы выше порога', () => {
            cart.add(testProduct1, 3); // 3000

            expect(cart.getDeliveryCost()).toBe(0);
        });

        test('должна возвращать 0 для суммы равной порогу', () => {
            cart.add(testProduct1, 2); // 2000

            expect(cart.getDeliveryCost()).toBe(0);
        });

    });

    describe('getFinalTotal()', () => {

        test('должна возвращать сумму с доставкой', () => {
            cart.add(testProduct2, 1); // 500 + 299 = 799

            expect(cart.getFinalTotal()).toBe(799);
        });

        test('должна возвращать сумму без доставки для большого заказа', () => {
            cart.add(testProduct1, 3); // 3000, доставка бесплатно

            expect(cart.getFinalTotal()).toBe(3000);
        });

    });

    describe('clear()', () => {

        test('должна очищать корзину', () => {
            cart.add(testProduct1, 1);
            cart.add(testProduct2, 1);

            cart.clear();

            expect(cart.items).toEqual([]);
            expect(cart.isEmpty()).toBe(true);
        });

        test('должна сохранять пустой массив в localStorage', () => {
            cart.add(testProduct1, 1);
            cart.clear();

            expect(localStorage.setItem).toHaveBeenLastCalledWith('cart', '[]');
        });

    });

    describe('isEmpty()', () => {

        test('должна возвращать true для пустой корзины', () => {
            expect(cart.isEmpty()).toBe(true);
        });

        test('должна возвращать false для непустой корзины', () => {
            cart.add(testProduct1, 1);
            expect(cart.isEmpty()).toBe(false);
        });

    });

    describe('save() и load()', () => {

        test('должна сохранять и загружать данные', () => {
            cart.add(testProduct1, 2);
            cart.add(testProduct2, 3);

            const savedData = localStorageMock.store['cart'];
            expect(savedData).toBeDefined();

            const parsedData = JSON.parse(savedData);
            expect(parsedData.length).toBe(2);
        });

        test('должна корректно обрабатывать некорректные данные в localStorage', () => {
            localStorageMock.store['cart'] = 'invalid json';

            // Не должна выбрасывать ошибку
            expect(() => new Cart()).not.toThrow();
        });

    });

    describe('updateBadge()', () => {

        test('должна обновлять текст бейджа', () => {
            cart.add(testProduct1, 3);

            const badge = document.getElementById('cartBadge');
            expect(badge.textContent).toBe('3');
        });

        test('должна скрывать бейдж для пустой корзины', () => {
            cart.clear();

            const badge = document.getElementById('cartBadge');
            expect(badge.style.display).toBe('none');
        });

    });

});
