/**
 * Тесты для config.js
 * @jest-environment jsdom
 */

// Мокаем module.exports для браузерного окружения
const CONFIG = require('../js/config.js');

describe('CONFIG', () => {

    describe('Структура конфигурации', () => {

        test('должен содержать WEBHOOK_URL', () => {
            expect(CONFIG.WEBHOOK_URL).toBeDefined();
            expect(typeof CONFIG.WEBHOOK_URL).toBe('string');
        });

        test('должен содержать настройки магазина SHOP', () => {
            expect(CONFIG.SHOP).toBeDefined();
            expect(CONFIG.SHOP.name).toBeDefined();
            expect(CONFIG.SHOP.logo).toBeDefined();
            expect(CONFIG.SHOP.currency).toBeDefined();
            expect(CONFIG.SHOP.currencyCode).toBeDefined();
        });

        test('должен содержать категории CATEGORIES', () => {
            expect(CONFIG.CATEGORIES).toBeDefined();
            expect(Array.isArray(CONFIG.CATEGORIES)).toBe(true);
            expect(CONFIG.CATEGORIES.length).toBeGreaterThan(0);
        });

        test('должен содержать товары PRODUCTS', () => {
            expect(CONFIG.PRODUCTS).toBeDefined();
            expect(Array.isArray(CONFIG.PRODUCTS)).toBe(true);
            expect(CONFIG.PRODUCTS.length).toBeGreaterThan(0);
        });

        test('должен содержать настройки доставки DELIVERY', () => {
            expect(CONFIG.DELIVERY).toBeDefined();
            expect(CONFIG.DELIVERY.freeShippingThreshold).toBeDefined();
            expect(CONFIG.DELIVERY.cost).toBeDefined();
            expect(CONFIG.DELIVERY.estimatedDays).toBeDefined();
        });

    });

    describe('Валидация категорий', () => {

        test('каждая категория должна иметь id, name, icon', () => {
            CONFIG.CATEGORIES.forEach(category => {
                expect(category.id).toBeDefined();
                expect(typeof category.id).toBe('string');
                expect(category.name).toBeDefined();
                expect(typeof category.name).toBe('string');
                expect(category.icon).toBeDefined();
            });
        });

        test('должна быть категория "all"', () => {
            const allCategory = CONFIG.CATEGORIES.find(c => c.id === 'all');
            expect(allCategory).toBeDefined();
        });

        test('ID категорий должны быть уникальными', () => {
            const ids = CONFIG.CATEGORIES.map(c => c.id);
            const uniqueIds = [...new Set(ids)];
            expect(ids.length).toBe(uniqueIds.length);
        });

    });

    describe('Валидация товаров', () => {

        test('каждый товар должен иметь обязательные поля', () => {
            CONFIG.PRODUCTS.forEach(product => {
                expect(product.id).toBeDefined();
                expect(product.name).toBeDefined();
                expect(product.price).toBeDefined();
                expect(typeof product.price).toBe('number');
                expect(product.price).toBeGreaterThan(0);
                expect(product.category).toBeDefined();
                expect(product.image).toBeDefined();
                expect(product.images).toBeDefined();
                expect(Array.isArray(product.images)).toBe(true);
                expect(product.description).toBeDefined();
                expect(product.features).toBeDefined();
                expect(Array.isArray(product.features)).toBe(true);
            });
        });

        test('ID товаров должны быть уникальными', () => {
            const ids = CONFIG.PRODUCTS.map(p => p.id);
            const uniqueIds = [...new Set(ids)];
            expect(ids.length).toBe(uniqueIds.length);
        });

        test('категория каждого товара должна существовать', () => {
            const categoryIds = CONFIG.CATEGORIES.map(c => c.id);

            CONFIG.PRODUCTS.forEach(product => {
                expect(categoryIds).toContain(product.category);
            });
        });

        test('рейтинг должен быть от 1 до 5', () => {
            CONFIG.PRODUCTS.forEach(product => {
                expect(product.rating).toBeGreaterThanOrEqual(1);
                expect(product.rating).toBeLessThanOrEqual(5);
            });
        });

        test('oldPrice должна быть больше price (если указана)', () => {
            CONFIG.PRODUCTS.forEach(product => {
                if (product.oldPrice) {
                    expect(product.oldPrice).toBeGreaterThan(product.price);
                }
            });
        });

    });

    describe('getProductById()', () => {

        test('должен вернуть товар по существующему ID', () => {
            const firstProduct = CONFIG.PRODUCTS[0];
            const found = CONFIG.getProductById(firstProduct.id);

            expect(found).toBeDefined();
            expect(found.id).toBe(firstProduct.id);
            expect(found.name).toBe(firstProduct.name);
        });

        test('должен вернуть undefined для несуществующего ID', () => {
            const found = CONFIG.getProductById('non-existent-id-12345');
            expect(found).toBeUndefined();
        });

        test('должен вернуть undefined для пустого ID', () => {
            const found = CONFIG.getProductById('');
            expect(found).toBeUndefined();
        });

        test('должен вернуть undefined для null', () => {
            const found = CONFIG.getProductById(null);
            expect(found).toBeUndefined();
        });

    });

    describe('getProductsByCategory()', () => {

        test('должен вернуть все товары для категории "all"', () => {
            const products = CONFIG.getProductsByCategory('all');

            expect(Array.isArray(products)).toBe(true);
            expect(products.length).toBe(CONFIG.PRODUCTS.length);
        });

        test('должен вернуть товары только указанной категории', () => {
            const category = CONFIG.CATEGORIES.find(c => c.id !== 'all');
            if (category) {
                const products = CONFIG.getProductsByCategory(category.id);

                products.forEach(product => {
                    expect(product.category).toBe(category.id);
                });
            }
        });

        test('должен вернуть пустой массив для несуществующей категории', () => {
            const products = CONFIG.getProductsByCategory('non-existent-category');
            expect(Array.isArray(products)).toBe(true);
            expect(products.length).toBe(0);
        });

    });

    describe('formatPrice()', () => {

        test('должен форматировать целое число', () => {
            const formatted = CONFIG.formatPrice(1000);
            expect(formatted).toContain('1');
            expect(formatted).toContain(CONFIG.SHOP.currency);
        });

        test('должен форматировать число с разделителями тысяч', () => {
            const formatted = CONFIG.formatPrice(1990);
            expect(formatted).toContain(CONFIG.SHOP.currency);
        });

        test('должен форматировать большие числа', () => {
            const formatted = CONFIG.formatPrice(999999);
            expect(formatted).toContain(CONFIG.SHOP.currency);
        });

        test('должен форматировать ноль', () => {
            const formatted = CONFIG.formatPrice(0);
            expect(formatted).toContain('0');
            expect(formatted).toContain(CONFIG.SHOP.currency);
        });

    });

    describe('getDiscount()', () => {

        test('должен рассчитать скидку 34% (990 от 1490)', () => {
            const discount = CONFIG.getDiscount(990, 1490);
            expect(discount).toBe(34);
        });

        test('должен рассчитать скидку 50%', () => {
            const discount = CONFIG.getDiscount(500, 1000);
            expect(discount).toBe(50);
        });

        test('должен рассчитать скидку 0% если oldPrice не указана', () => {
            const discount = CONFIG.getDiscount(990, null);
            expect(discount).toBe(0);
        });

        test('должен рассчитать скидку 0% если oldPrice равна price', () => {
            const discount = CONFIG.getDiscount(1000, 1000);
            expect(discount).toBe(0);
        });

        test('должен рассчитать скидку 0% если oldPrice меньше price', () => {
            const discount = CONFIG.getDiscount(1000, 500);
            expect(discount).toBe(0);
        });

        test('должен округлять скидку до целого числа', () => {
            const discount = CONFIG.getDiscount(333, 1000);
            expect(Number.isInteger(discount)).toBe(true);
        });

    });

});
