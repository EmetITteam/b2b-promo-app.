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
  setLastOrder: (orderNum) => sessionStorage.setItem('b2b_lastOrder', orderNum),
  getLastOrder: () => sessionStorage.getItem('b2b_lastOrder')
};

// --- Глобальные переменные для данных (чтобы не дергать mockData 100 раз) ---
let allPromotionsData = [];
let currentModalPromo = null;

// --- Общие функции ---

/** Перенаправляет на логин, если пользователь не авторизован */
function protectPage() {
  const user = storage.getUser();
  if (!user) {
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

// --- 1. Страница Логина (Без изменений) ---
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
    
    try {
      const data = getMockClientData(phone);
      storage.setUser(data.clientInfo);
      storage.setCart([]); // Очищаем корзину при новом входе
      window.location.href = 'promotions.html';
    } catch (err) {
      errorEl.textContent = 'Клиент не найден (ошибка заглушки)';
    }
  });
}

// --- 2. Страница Акций (ПОЛНОСТЬЮ ПЕРЕПИСАНА) ---
function initPromotionsPage() {
  const user = protectPage();
  if (!user) return; 

  // Заполняем "Шапку"
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('logout-btn').addEventListener('click', () => {
    storage.clear();
    const path = window.location.pathname.replace(/\/[^/]+$/, '/');
    window.location.href = path + 'index.html';
  });

  // Получаем акции и сохраняем в глобальную переменную
  const { promotionsByGroup } = getMockClientData(user.phone);
  allPromotionsData = promotionsByGroup;
  
  const container = document.getElementById('promo-groups-container');
  if (allPromotionsData.length === 0) {
    container.innerHTML = '<p>Для вас пока нет доступных акций.</p>';
    return;
  }
  
  // Отрисовка групп и карточек
  container.innerHTML = ''; // Очистка
  allPromotionsData.forEach(group => {
    // 1. Создаем обертку для группы
    const groupEl = document.createElement('div');
    groupEl.className = 'promo-group';
    
    // 2. Создаем заголовок группы
    const titleEl = document.createElement('h3');
    titleEl.className = 'promo-group-title';
    titleEl.textContent = group.groupName;
    groupEl.appendChild(titleEl);
    
    // 3. Создаем контейнер для карточек
    const listEl = document.createElement('div');
    listEl.className = 'promo-list';
    
    // 4. Рендерим карточки в зависимости от типа акции
    group.promotions.forEach(promo => {
      let cardHtml = '';
      if (promo.type === 'simple_discount') {
        cardHtml = createSimplePromoCard(promo);
      } else if (promo.type === 'buy_x_get_y') {
        cardHtml = createComplexPromoCard(promo);
      }
      listEl.innerHTML += cardHtml;
    });
    
    groupEl.appendChild(listEl);
    container.appendChild(groupEl);
  });
  
  // Вешаем ОДИН обработчик на весь контейнер (Event Delegation)
  container.addEventListener('click', handlePromoCardClick);
  
  // Инициализируем модальное окно
  initModal();
  
  updateMiniCart(); // Обновляем мини-корзину при загрузке
}

// --- ФУНКЦИИ РЕНДЕРИНГА КАРТОЧЕК ---

/** Создает HTML для простой акции (скидка) */
function createSimplePromoCard(promo) {
  const product = promo.product;
  return `
    <div class="promo-card">
      <h3>${promo.title}</h3>
      <p>${promo.description}</p>
      <div class="promo-price">
        ${formatPrice(product.price)}
        ${product.originalPrice ? `<span class="original-price">${formatPrice(product.originalPrice)}</span>` : ''}
      </div>
      <div class="promo-actions">
        <input type="number" value="1" min="1" class="quantity-input" id="qty-${product.id}">
        <button class="btn-secondary btn-add-simple" 
                data-product-id="${product.id}" 
                data-promo-id="${promo.id}">В корзину</button>
      </div>
    </div>
  `;
}

/** Создает HTML для сложной акции (4+1) */
function createComplexPromoCard(promo) {
  return `
    <div class="promo-card complex">
      <h3>${promo.title}</h3>
      <p>${promo.description}</p>
      <ul class="assortment-preview">
        ${promo.assortment.slice(0, 3).map(item => `<li>${item.name}</li>`).join('')}
        ${promo.assortment.length > 3 ? `<li>и еще ${promo.assortment.length - 3}...</li>` : ''}
      </ul>
      <div class="promo-actions">
        <button class="btn-primary btn-open-complex" data-promo-id="${promo.id}">
          Выбрать товары
        </button>
      </div>
    </div>
  `;
}

// --- ОБРАБОТЧИКИ КЛИКОВ НА КАРТОЧКАХ ---

function handlePromoCardClick(e) {
  // 1. Клик по кнопке "В корзину" (Простая акция)
  if (e.target.classList.contains('btn-add-simple')) {
    const button = e.target;
    const productId = button.dataset.productId;
    const promoId = button.dataset.promoId;
    const quantityInput = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(quantityInput.value);
    
    // Находим нужный продукт
    const promo = findPromoById(promoId);
    if (!promo || !promo.product) return;
    
    if (quantity > 0) {
      addSimpleToCart(promo.product, quantity);
      quantityInput.value = 1; // Сброс
    }
  }
  
  // 2. Клик по кнопке "Выбрать товары" (Сложная акция)
  if (e.target.classList.contains('btn-open-complex')) {
    const button = e.target;
    const promoId = button.dataset.promoId;
    const promo = findPromoById(promoId);
    if (promo) {
      openModal(promo);
    }
  }
}

/** Находит объект акции по ID в наших глобальных данных */
function findPromoById(promoId) {
  for (const group of allPromotionsData) {
    for (const promo of group.promotions) {
      if (promo.id === promoId) {
        return promo;
      }
    }
  }
  return null;
}

// --- ЛОГИКА КОРЗИНЫ ---

/** Добавляет простой товар в корзину */
function addSimpleToCart(product, quantity) {
  const cart = storage.getCart();
  const existingItem = cart.find(item => item.id === product.id && item.promoType === 'simple');

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ ...product, quantity, promoType: 'simple' });
  }
  
  storage.setCart(cart);
  updateMiniCart();
  alert(`Добавлено: ${product.name} (${quantity} шт.)`);
}

/** Добавляет сложную акцию (N+1) в корзину */
function addComplexToCart(promo, buyItems, giftItem) {
  const cart = storage.getCart();
  
  // Считаем общую цену только покупаемых товаров
  const totalPrice = buyItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Создаем ОДИН сложный объект для корзины
  const cartItem = {
    id: promo.id + '-' + Date.now(), // Уникальный ID для этой "сборки"
    promoType: 'complex',
    title: promo.title,
    quantity: 1, // 1 акционный набор
    price: totalPrice, // Общая цена за 4 товара
    details: {
      buyItems: buyItems, // Массив купленных
      giftItem: giftItem  // Объект подарка
    }
  };
  
  cart.push(cartItem);
  storage.setCart(cart);
  updateMiniCart();
  alert(`Акция "${promo.title}" добавлена в корзину!`);
}

function updateMiniCart() {
  const cart = storage.getCart();
  const miniCartEl = document.getElementById('mini-cart');
  
  if (cart.length === 0) {
    miniCartEl.style.display = 'none';
    return;
  }
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  // Общая цена - это сумма по всем 'price' в корзине
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
  
  miniCartEl.innerHTML = `
    <span>Товаров: ${totalItems} шт.</span>
    <span>Сумма: ${formatPrice(totalPrice)}</span>
    <a href="checkout.html" class="btn-primary">
      Оформить заказ
    </a>
  `;
  miniCartEl.style.display = 'flex';
}

// --- 3. Страница Оформления (ПЕРЕПИСАНА) ---
function initCheckoutPage() {
  const user = protectPage();
  if (!user) return;
  
  const cart = storage.getCart();
  const checkoutPageEl = document.querySelector('.checkout-page');
  
  if (cart.length === 0) {
    checkoutPageEl.innerHTML = `
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
    let itemHtml = '';
    
    // Рендерим по-разному в зависимости от типа
    if (item.promoType === 'simple') {
      // --- Простой товар ---
      const itemTotal = item.price * item.quantity;
      totalPrice += itemTotal;
      itemHtml = `
        <div class="summary-item">
          <span>${item.name} (x${item.quantity})</span>
          <strong>${formatPrice(itemTotal)}</strong>
        </div>
      `;
    } else if (item.promoType === 'complex') {
      // --- Сложная акция ---
      totalPrice += item.price; // 'price' уже содержит сумму за 4 товара
      itemHtml = `
        <div class="summary-item complex-promo">
          <span><strong>Акция: ${item.title} (x${item.quantity})</strong></span>
          <strong>${formatPrice(item.price)}</strong>
          
          <div class="complex-details">
            <strong>Куплено:</strong>
            <ul>
              ${item.details.buyItems.map(buy => `<li>${buy.name} (x${buy.quantity})</li>`).join('')}
            </ul>
            <strong>Подарок:</strong>
            <ul>
              <li>${item.details.giftItem.name} (x1) - <strong>${formatPrice(0)}</strong></li>
            </ul>
          </div>
        </div>
      `;
    }
    
    // Вставляем HTML перед <hr>
    summaryEl.querySelector('hr').insertAdjacentHTML('beforebegin', itemHtml);
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
    
    const orderData = {
       clientId: user.clientId,
       ...orderDetails,
       items: cart // Отправляем всю корзину как есть
     };
     
    const response = createMockOrder(orderData);
    
    if (response.status === 'success') {
      storage.setCart([]); 
      storage.setLastOrder(response.orderNumber);
      window.location.href = 'thankyou.html';
    } else {
      alert('Ошибка при создании заказа. Попробуйте снова.');
    }
  });
}

// --- 4. Страница "Спасибо" (Без изменений) ---
function initThankYouPage() {
  protectPage();
  const orderNumber = storage.getLastOrder();
  
  if (orderNumber) {
    document.getElementById('order-number').textContent = orderNumber;
  } else {
    document.getElementById('order-number').textContent = '...ошибка...';
  }
  
  sessionStorage.removeItem('b2b_lastOrder');
}


// --- 5. ЛОГИКА МОДАЛЬНОГО ОКНА (Новый блок) ---

// Навешиваем базовые слушатели
function initModal() {
  const modal = document.getElementById('promo-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  
  // Закрытие по кнопке
  closeBtn.addEventListener('click', closeModal);
  
  // Закрытие по клику на фон
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Главная кнопка "Добавить в заказ"
  document.getElementById('modal-add-to-cart-btn').addEventListener('click', () => {
    // Собираем данные и добавляем в корзину
    const { buyItems, giftItem } = getModalSelections();
    
    if (currentModalPromo && buyItems.length > 0 && giftItem) {
      addComplexToCart(currentModalPromo, buyItems, giftItem);
      closeModal();
    } else {
      alert("Ошибка. Не все товары выбраны.");
    }
  });
}

/** Открывает и заполняет модальное окно данными акции */
function openModal(promo) {
  currentModalPromo = promo; // Сохраняем текущую акцию
  const modal = document.getElementById('promo-modal');
  
  // Заполняем шапку
  document.getElementById('modal-title').textContent = promo.title;
  document.getElementById('modal-description').textContent = promo.description;
  
  // Заполняем счетчики
  document.getElementById('modal-buy-needed').textContent = promo.buyQuantity;
  document.getElementById('modal-gift-needed').textContent = promo.getQuantity;
  
  // Рендерим список "Купить"
  const buyListEl = document.getElementById('modal-buy-list');
  buyListEl.innerHTML = '';
  promo.assortment.forEach(item => {
    buyListEl.innerHTML += `
      <div class="assortment-item">
        <span>${item.name} (${formatPrice(item.price)})</span>
        <input type="number" class="quantity-input modal-buy-input" value="0" min="0" data-id="${item.id}" data-price="${item.price}">
      </div>
    `;
  });
  
  // Рендерим список "Подарок"
  const giftListEl = document.getElementById('modal-gift-list');
  giftListEl.innerHTML = `<p>Выберите ${promo.buyQuantity} товара, чтобы активировать подарки</p>`;
  
  // Вешаем слушатели на инпуты
  buyListEl.addEventListener('input', updateModalState);
  
  // Сбрасываем и показываем
  updateModalState();
  modal.style.display = 'flex';
}

/** Закрывает модальное окно и чистит данные */
function closeModal() {
  const modal = document.getElementById('promo-modal');
  modal.style.display = 'none';
  currentModalPromo = null; // Сбрасываем текущую акцию
  
  // Очистка инпутов (на всякий случай)
  document.getElementById('modal-buy-list').innerHTML = '';
  document.getElementById('modal-gift-list').innerHTML = '';
}

/** Обновляет состояние модального окна (счетчики, подарки, кнопка) */
function updateModalState() {
  if (!currentModalPromo) return;

  const { buyQuantity, getQuantity, assortment } = currentModalPromo;
  const { totalBuyQty, totalPrice } = getModalSelections();

  // 1. Обновляем счетчик "Куплено"
  document.getElementById('modal-buy-total').textContent = totalBuyQty;
  
  // 2. Обновляем итоговую цену
  document.getElementById('modal-total-price').textContent = formatPrice(totalPrice);

  // 3. Проверяем, пора ли показывать подарки
  const giftListEl = document.getElementById('modal-gift-list');
  const giftsNeeded = getQuantity;
  let totalGiftQty = 0;
  
  if (totalBuyQty >= buyQuantity) {
    // Пора! Рендерим список подарков (если он еще не там)
    if (!giftListEl.querySelector('.assortment-item')) {
      giftListEl.innerHTML = ''; // Очищаем
      assortment.forEach(item => {
        giftListEl.innerHTML += `
          <div class="assortment-item gift">
            <label>
              <input type="radio" name="gift-selection" class="modal-gift-input" data-id="${item.id}">
              ${item.name}
            </label>
          </div>
        `;
      });
      // Вешаем слушатель
      giftListEl.addEventListener('change', updateModalState);
    }
    
    // Считаем, сколько подарков выбрано
    const selectedGift = giftListEl.querySelector('input[name="gift-selection"]:checked');
    totalGiftQty = selectedGift ? 1 : 0; // Для 4+1 у нас 1 подарок

  } else {
    // Еще рано, прячем подарки
    giftListEl.innerHTML = `<p>Выберите еще ${buyQuantity - totalBuyQty} товара, чтобы активировать подарки</p>`;
  }
  
  document.getElementById('modal-gift-total').textContent = totalGiftQty;

  // 4. Активируем/деактивируем кнопку
  const addButton = document.getElementById('modal-add-to-cart-btn');
  const isReady = (totalBuyQty >= buyQuantity) && (totalGiftQty >= giftsNeeded);
  addButton.disabled = !isReady;
}

/** Собирает данные со всех инпутов в модальном окне */
function getModalSelections() {
  if (!currentModalPromo) return { buyItems: [], giftItem: null, totalBuyQty: 0, totalPrice: 0 };

  let totalBuyQty = 0;
  let totalPrice = 0;
  const buyItems = [];
  
  // Собираем "Купленные"
  document.querySelectorAll('.modal-buy-input').forEach(input => {
    const quantity = parseInt(input.value);
    if (quantity > 0) {
      const id = input.dataset.id;
      const product = currentModalPromo.assortment.find(p => p.id === id);
      buyItems.push({ ...product, quantity });
      totalBuyQty += quantity;
      totalPrice += product.price * quantity;
    }
  });

  // Собираем "Подарок"
  let giftItem = null;
  const giftInput = document.querySelector('.modal-gift-input:checked');
  if (giftInput) {
    const id = giftInput.dataset.id;
    giftItem = currentModalPromo.assortment.find(p => p.id === id);
  }

  return { buyItems, giftItem, totalBuyQty, totalPrice };
}
