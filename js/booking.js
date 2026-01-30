// ===================================
// КЛАСС УПРАВЛЕНИЯ БРОНИРОВАНИЯМИ
// ===================================

class BookingManager {
    constructor() {
        this.bookings = [];
        this.currentBooking = null;
        this.load();
    }

    // ===================================
    // ТЕКУЩЕЕ БРОНИРОВАНИЕ (в процессе создания)
    // ===================================

    // Начать новое бронирование
    startBooking(serviceId) {
        const service = CONFIG.getServiceById(serviceId);
        if (!service) return null;

        this.currentBooking = {
            id: this.generateId(),
            serviceId: serviceId,
            service: service,
            masterId: null,
            master: null,
            date: null,
            time: null,
            customerName: '',
            customerPhone: '',
            customerComment: '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        return this.currentBooking;
    }

    // Выбрать мастера
    selectMaster(masterId) {
        if (!this.currentBooking) return null;

        const master = CONFIG.getMasterById(masterId);
        if (!master) return null;

        this.currentBooking.masterId = masterId;
        this.currentBooking.master = master;

        return this.currentBooking;
    }

    // Выбрать дату
    selectDate(dateString) {
        if (!this.currentBooking) return null;

        this.currentBooking.date = dateString;
        this.currentBooking.time = null; // Сбрасываем время при смене даты

        return this.currentBooking;
    }

    // Выбрать время
    selectTime(time) {
        if (!this.currentBooking) return null;

        this.currentBooking.time = time;

        return this.currentBooking;
    }

    // Установить контактные данные
    setCustomerInfo(name, phone, comment = '') {
        if (!this.currentBooking) return null;

        this.currentBooking.customerName = name;
        this.currentBooking.customerPhone = phone;
        this.currentBooking.customerComment = comment;

        return this.currentBooking;
    }

    // Получить текущее бронирование
    getCurrentBooking() {
        return this.currentBooking;
    }

    // Проверить, готово ли бронирование к подтверждению
    isBookingReady() {
        if (!this.currentBooking) return false;

        return (
            this.currentBooking.serviceId &&
            this.currentBooking.masterId &&
            this.currentBooking.date &&
            this.currentBooking.time
        );
    }

    // Сбросить текущее бронирование
    resetCurrentBooking() {
        this.currentBooking = null;
    }

    // ===================================
    // ПОДТВЕРЖДЕНИЕ И СОХРАНЕНИЕ
    // ===================================

    // Подтвердить бронирование
    confirmBooking() {
        if (!this.currentBooking) return null;
        if (!this.isBookingReady()) return null;

        this.currentBooking.status = 'confirmed';
        this.currentBooking.confirmedAt = new Date().toISOString();

        // Добавить в список бронирований
        this.bookings.push({ ...this.currentBooking });

        // Сохранить в localStorage
        this.save();

        const confirmedBooking = { ...this.currentBooking };

        // Сбросить текущее бронирование
        this.currentBooking = null;

        return confirmedBooking;
    }

    // ===================================
    // РАБОТА С СОХРАНЁННЫМИ БРОНИРОВАНИЯМИ
    // ===================================

    // Получить все бронирования пользователя
    getAllBookings() {
        return this.bookings;
    }

    // Получить предстоящие бронирования
    getUpcomingBookings() {
        const now = new Date();
        return this.bookings
            .filter(b => {
                const bookingDate = new Date(b.date + 'T' + b.time);
                return bookingDate >= now && b.status !== 'cancelled';
            })
            .sort((a, b) => {
                const dateA = new Date(a.date + 'T' + a.time);
                const dateB = new Date(b.date + 'T' + b.time);
                return dateA - dateB;
            });
    }

    // Получить прошедшие бронирования
    getPastBookings() {
        const now = new Date();
        return this.bookings
            .filter(b => {
                const bookingDate = new Date(b.date + 'T' + b.time);
                return bookingDate < now || b.status === 'cancelled';
            })
            .sort((a, b) => {
                const dateA = new Date(a.date + 'T' + a.time);
                const dateB = new Date(b.date + 'T' + b.time);
                return dateB - dateA; // Сначала более новые
            });
    }

    // Получить бронирование по ID
    getBookingById(bookingId) {
        return this.bookings.find(b => b.id === bookingId);
    }

    // Отменить бронирование
    cancelBooking(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) return false;

        booking.status = 'cancelled';
        booking.cancelledAt = new Date().toISOString();

        this.save();
        return true;
    }

    // Количество предстоящих бронирований
    getUpcomingCount() {
        return this.getUpcomingBookings().length;
    }

    // ===================================
    // ПРОВЕРКА ДОСТУПНОСТИ СЛОТОВ
    // ===================================

    // Получить занятые слоты мастера на дату
    getBookedSlots(masterId, dateString) {
        const bookedSlots = [];

        // Слоты из демо-данных
        CONFIG.DEMO_BOOKINGS.forEach(booking => {
            if (booking.masterId === masterId && booking.date === dateString) {
                bookedSlots.push(booking.time);
            }
        });

        // Слоты из сохранённых бронирований
        this.bookings.forEach(booking => {
            if (
                booking.masterId === masterId &&
                booking.date === dateString &&
                booking.status !== 'cancelled'
            ) {
                // Добавляем все слоты, занятые этой услугой
                const slotsNeeded = Math.ceil(booking.service.duration / CONFIG.SCHEDULE.slotDuration);
                const startIndex = CONFIG.getTimeSlots().indexOf(booking.time);

                for (let i = 0; i < slotsNeeded; i++) {
                    const slotTime = CONFIG.getTimeSlots()[startIndex + i];
                    if (slotTime) {
                        bookedSlots.push(slotTime);
                    }
                }
            }
        });

        return [...new Set(bookedSlots)]; // Убираем дубликаты
    }

    // Проверить, доступен ли слот для услуги
    isSlotAvailable(masterId, dateString, time, serviceDuration) {
        const allSlots = CONFIG.getTimeSlots();
        const slotsNeeded = Math.ceil(serviceDuration / CONFIG.SCHEDULE.slotDuration);
        const startIndex = allSlots.indexOf(time);

        // Проверяем, что все нужные слоты доступны
        const bookedSlots = this.getBookedSlots(masterId, dateString);

        for (let i = 0; i < slotsNeeded; i++) {
            const slotTime = allSlots[startIndex + i];

            // Слот не существует (выходит за рабочее время)
            if (!slotTime) return false;

            // Слот уже занят
            if (bookedSlots.includes(slotTime)) return false;
        }

        // Проверка минимального времени до записи
        const now = new Date();
        const slotDateTime = new Date(dateString + 'T' + time);
        const hoursUntilSlot = (slotDateTime - now) / (1000 * 60 * 60);

        if (hoursUntilSlot < CONFIG.SCHEDULE.minBookingHoursAhead) {
            return false;
        }

        return true;
    }

    // Получить доступные слоты для услуги у мастера на дату
    getAvailableSlots(masterId, dateString, serviceDuration) {
        const allSlots = CONFIG.getTimeSlots();
        const availableSlots = [];

        allSlots.forEach(time => {
            if (this.isSlotAvailable(masterId, dateString, time, serviceDuration)) {
                availableSlots.push(time);
            }
        });

        return availableSlots;
    }

    // ===================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ===================================

    // Генерация уникального ID
    generateId() {
        return 'booking-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Сохранить в localStorage
    save() {
        try {
            localStorage.setItem('beautyStudioBookings', JSON.stringify(this.bookings));
        } catch (e) {
            console.error('Failed to save bookings:', e);
        }
    }

    // Загрузить из localStorage
    load() {
        try {
            const saved = localStorage.getItem('beautyStudioBookings');
            if (saved) {
                this.bookings = JSON.parse(saved);

                // Обновляем данные услуг и мастеров (они могут измениться в config)
                this.bookings = this.bookings.map(booking => {
                    const service = CONFIG.getServiceById(booking.serviceId);
                    const master = CONFIG.getMasterById(booking.masterId);

                    return {
                        ...booking,
                        service: service || booking.service,
                        master: master || booking.master
                    };
                });
            }
        } catch (e) {
            console.error('Failed to load bookings:', e);
            this.bookings = [];
        }
    }

    // Очистить все бронирования (для тестирования)
    clearAll() {
        this.bookings = [];
        this.currentBooking = null;
        localStorage.removeItem('beautyStudioBookings');
    }
}

// Создаём глобальный экземпляр
const bookingManager = new BookingManager();

// Экспорт для тестов
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookingManager;
}
