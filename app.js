// --- "Мозг" приложения ---

// Используем localStorage для хранения данных между страницами
const storage = {
  getUser: () => JSON.parse(localStorage.getItem('b2b_user')),
  setUser: (user) => localStorage.setItem('b2b_user', JSON.stringify(user)),
  getCart: () => JSON.parse(localStorage.getItem('b2b_cart')) || [],
  setCart: (cart) => localStorage.setItem('b2b_cart', JSON.stringify(cart)),
  clear: () => {
    localStorage.removeItem('b2b_user');
    localStorage.removeItem('b2b_cart');
  },
  // Для страницы "Спасибо"
  setLastOrder: (orderNum) => sessionStorage.setItem('b2b_lastOrder', orderNum),
  getLastOrder: () => sessionStorage.getItem('b2b_lastOrder')
};

// --- Общие функции ---

/** Перенаправляет на логин, если пользователь не авторизован */
function protectPage() {
  const user = storage.getUser();
  if (!user) {
    // Вычисляем путь к корню сайта (важно для GitHub Pages)
    const path = window.location.pathname.replace(/\/[^/]+$/, '/');
    window.location.href = path + 'index.html';
  }
  return user;
}

/** Форматирует цену */
function formatPrice(price) {
  return price.toLocaleString('uk-UA') + ' грн';
}

// --- Логика для конкретных страниц ---

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.endsWith('/') || path.endsWith('index.html')) {
    initLoginPage();
  } else if (path.endsWith('promotions.html')) {
    initPromotionsPage();
  } else if (path.endsWith('checkout.html')) {
    initCheckoutPage();
  } else if (path.endsWith('thankyou.html')) {
    initThankYouPage();
  }
});

// --- 1. Страница Логина ---
function initLoginPage() {
  const form = document.getElementById('login-form');
  const phoneInput = document.getElementById('phone');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = phoneInput.value;
    if (phone.length < 10) {
      errorEl.textContent = 'Введите корректный номер';
      return;
    }
    
    // Имитация логина (по ТЗ - без кода)
    try {
      const data = getMockClientData(phone);
      storage.setUser(data.clientInfo);
      storage.setCart([]); // Очищаем корзину при новом входе
      window.location.href = 'promotions.html'; // Переход на акции
    } catch (err) {
      errorEl.textContent = 'Клиент не найден (ошибка заглушки)';
    }
  });
}

// --- 2. Страница Акций ---
function initPromotionsPage() {
  const user = protectPage();
  if (!user) return; // Если сработал редирект, ничего не делаем

  // Заполняем "Шапку"
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('logout-btn').addEventListener('click', () => {
    storage.clear();
    const path = window.location.pathname.replace(/\/[^/]+$/, '/');
    window.location.href = path + 'index.html';
  });

  // Загружаем акции (из заглушки)
  const promoListEl = document.getElementById('promo-list');
  const { promotions } = getMockClientData(user.phone); // Получаем акции
  
  if (promotions.length === 0) {
    promoListEl.innerHTML = '<p>Для вас пока нет доступных акций.</p>';
    return;
  }
  
  // Отрисовка карточек
  promoListEl.innerHTML = ''; // Очистка
  promotions.forEach(promo => {
    const card = document.createElement('div');
    card.className = 'promo-card';
    card.innerHTML = `
      <h3>${promo.title}</h3>
      <p>${promo.description}</p>
      <div class="promo-price">${formatPrice(promo.price)}</div>
      <div class="promo-actions">
        <input type="number" value="1" min="1" class="quantity-input" id="qty-${promo.id}">
        <button class="btn-secondary" data-id="${promo.id}">В корзину</button>
      </div>
    `;
    
    // Кнопка "В корзину"
    card.querySelector('button').addEventListener('click', () => {
      const quantityInput = document.getElementById(`qty-${promo.id}`);
      const quantity = parseInt(quantityInput.value);
      if (quantity > 0) {
        addToCart(promo, quantity);
        quantityInput.value = 1; // Сброс
      }
    });
    
    promoListEl.appendChild(card);
  });
  
  updateMiniCart(); // Обновляем мини-корзину при загрузке
}

function addToCart(product, quantity) {
  const cart = storage.getCart();
  const existingItem = cart.find(item => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ ...product, quantity });
  }
  
  storage.setCart(cart);
  updateMiniCart();
  alert(`Добавлено: ${product.title} (${quantity} шт.)`);
}

function updateMiniCart() {
  const cart = storage.getCart();
  const miniCartEl = document.getElementById('mini-cart');
  
  if (cart.length === 0) {
    miniCartEl.style.display = 'none';
    return;
  }
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  miniCartEl.innerHTML = `
    <span>Товаров: ${totalItems} шт.</span>
    <span>Сумма: ${formatPrice(totalPrice)}</span>
    <a href="checkout.html" class="btn-primary">
      Оформить заказ
    </a>
  `;
  miniCartEl.style.display = 'flex';
}

// --- 3. Страница Оформления ---
function initCheckoutPage() {
  const user = protectPage();
  if (!user) return;
  
  const cart = storage.getCart();
  if (cart.length === 0) {
    document.querySelector('.checkout-page').innerHTML = `
      <h2>Ваша корзина пуста</h2>
      <a href="promotions.html" class="btn-primary">Вернуться к акциям</a>
    `;
    return;
  }

  // Заполняем форму данными по умолчанию
  document.getElementById('recipientName').value = user.recipientName;
  document.getElementById('shippingAddress').value = user.defaultAddress;

  // Заполняем "Состав заказа"
  const summaryEl = document.getElementById('order-summary');
  const totalPriceEl = document.getElementById('summary-total-price');
  let totalPrice = 0;
  
  cart.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'summary-item';
    const itemTotal = item.price * item.quantity;
    totalPrice += itemTotal;
    itemEl.innerHTML = `
      <span>${item.title} (x${item.quantity})</span>
      <strong>${formatPrice(itemTotal)}</strong>
    `;
    // Вставляем перед <hr>
    summaryEl.insertBefore(itemEl, summaryEl.querySelector('hr'));
  });
  
  totalPriceEl.textContent = formatPrice(totalPrice);

  // Обработка отправки формы
  document.getElementById('checkout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const orderDetails = {
      recipientName: document.getElementById('recipientName').value,
      shippingAddress: document.getElementById('shippingAddress').value,
      comment: document.getElementById('comment').value,
    };
    
    // Собираем данные для "API"
    const orderData = {
       clientId: user.clientId,
       ...orderDetails,
       items: cart.map(item => ({ id: item.id, quantity: item.quantity }))
     };
     
    // Имитируем отправку заказа
    const response = createMockOrder(orderData);
    
    if (response.status === 'success') {
      storage.setCart([]); // Очищаем корзину
      storage.setLastOrder(response.orderNumber); // Сохраняем номер для след. страницы
      window.location.href = 'thankyou.html';
    } else {
      alert('Ошибка при создании заказа. Попробуйте снова.');
    }
  });
}

// --- 4. Страница "Спасибо" ---
function initThankYouPage() {
  protectPage(); // Просто для защиты, юзера не запрашиваем
  const orderNumber = storage.getLastOrder();
  
  if (orderNumber) {
    document.getElementById('order-number').textContent = orderNumber;
  } else {
    // Если как-то попали сюда без заказа
    document.getElementById('order-number').textContent = '...ошибка...';
  }
  
  // Очищаем, чтобы при F5 номер не остался
  sessionStorage.removeItem('b2b_lastOrder');
}
