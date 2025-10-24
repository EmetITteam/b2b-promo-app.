// --- "Мозг" приложения ---
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

// --- Глобальные переменные  для данных ---
let allPromotionsData = [];
let currentModalPromo = null;

// --- Общие функции ---
function protectPage() {
  const user = storage.getUser();
  if (!user) {
    const path = window.location.pathname.replace(/\/[^/]+$/, '/');
    window.location.href = path + 'index.html';
  }
  return user;
}
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
      storage.setCart([]);
      window.location.href = 'promotions.html';
    } catch (err) {
      errorEl.textContent = 'Клиент не найден (ошибка заглушки)';
    }
  });
}

// --- 2. Страница Акций (НОВАЯ ЛОГИКА Вкладок) ---
function initPromotionsPage() {
  const user = protectPage();
  if (!user) return; 

  // Заполняем "Шапку" (без изменений)
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('logout-btn').addEventListener('click', () => {
    storage.clear();
    const path = window.location.pathname.replace(/\/[^/]+$/, '/');
    window.location.href = path + 'index.html';
  });

  // Получаем акции и сохраняем
  const { promotionsByGroup } = getMockClientData(user.phone);
  allPromotionsData = promotionsByGroup;
  
  const tabsNav = document.getElementById('tabs-nav');
  const tabsContent = document.getElementById('tabs-content');
  
  if (allPromotionsData.length === 0) {
    tabsNav.innerHTML = '<p>Для вас пока нет доступных акций.</p>';
    return;
  }
  
  // --- НОВАЯ ЛОГИКА: Создаем вкладки и панели ---
  allPromotionsData.forEach((group, index) => {
    const tabId = `tab-panel-${index}`;
    const isActive = index === 0; // Первая вкладка - активная
    
    // 1. Создаем кнопку-вкладку
    const tabBtn = document.createElement('button');
    tabBtn.className = `tab-btn ${isActive ? 'active' : ''}`;
    tabBtn.textContent = group.groupName;
    tabBtn.setAttribute('data-tab', tabId);
    tabsNav.appendChild(tabBtn);
    
    // 2. Создаем панель-контент
    const tabPanel = document.createElement('div');
    tabPanel.className = `tab-panel ${isActive ? 'active' : ''}`;
    tabPanel.id = tabId;
    
    // 3. Создаем список акций ВНУТРИ панели
    const promoList = document.createElement('div');
    promoList.className = 'promo-list';
    
    // 4. Рендерим карточки (логика та же, что и раньше)
    group.promotions.forEach(promo => {
      let cardHtml = '';
      if (promo.type === 'simple_discount') {
        cardHtml = createSimplePromoCard(promo);
      } else if (promo.type === 'buy_x_get_y') {
        cardHtml = createComplexPromoCard(promo);
      }
      promoList.innerHTML += cardHtml;
    });
    
    tabPanel.appendChild(promoList);
    tabsContent.appendChild(tabPanel);
  });
  
  // Вешаем ОДИН слушатель на навигацию вкладок
  tabsNav.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn')) {
      const targetTabId = e.target.dataset.tab;
      
      // Убираем 'active' у всех кнопок и панелей
      tabsNav.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      tabsContent.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
      
      // Добавляем 'active' нужным
      e.target.classList.add('active');
      document.getElementById(targetTabId).classList.add('active');
    }
  });
  
  // Вешаем ОДИН слушатель на ВЕСЬ контент (для кнопок "В корзину" / "Выбрать")
  tabsContent.addEventListener('click', handlePromoCardClick);
  
  // Инициализируем модальное окно
  initModal();
  
  updateMiniCart(); // Обновляем мини-корзину при загрузке
}

// --- ФУНКЦИИ РЕНДЕРИНГА КАРТОЧЕК (Без изменений) ---
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

// --- ОБРАБОТЧИКИ КЛИКОВ НА КАРТОЧКАХ (Без изменений) ---
function handlePromoCardClick(e) {
  // 1. Клик по кнопке "В корзину" (Простая акция)
  if (e.target.classList.contains('btn-add-simple')) {
    const button = e.target;
    const productId = button.dataset.productId;
    const promoId = button.dataset.promoId;
    const quantityInput = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(quantityInput.value);
    
    const promo = findPromoById(promoId);
    if (!promo || !promo.product) return;
    
    if (quantity > 0) {
      addSimpleToCart(promo.product, quantity);
      quantityInput.value = 1;
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

// --- ЛОГИКА КОРЗИНЫ (Без изменений) ---
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
function addComplexToCart(promo, buyItems, giftItem) {
  const cart = storage.getCart();
  const totalPrice = buyItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const cartItem = {
    id: promo.id + '-' + Date.now(),
    promoType: 'complex',
    title: promo.title,
    quantity: 1,
    price: totalPrice,
    details: {
      buyItems: buyItems,
      giftItem: giftItem
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

// --- 3. Страница Оформления (Без изменений) ---
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

  document.getElementById('recipientName').value = user.recipientName;
  document.getElementById('shippingAddress').value = user.defaultAddress;

  const summaryEl = document.getElementById('order-summary');
  const totalPriceEl = document.getElementById('summary-total-price');
  let totalPrice = 0;
  
  cart.forEach(item => {
    let itemHtml = '';
    
    if (item.promoType === 'simple') {
      const itemTotal = item.price * item.quantity;
      totalPrice += itemTotal;
      itemHtml = `
        <div class="summary-item">
          <span>${item.name} (x${item.quantity})</span>
          <strong>${formatPrice(itemTotal)}</strong>
        </div>
      `;
    } else if (item.promoType === 'complex') {
      totalPrice += item.price;
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
    
    summaryEl.querySelector('hr').insertAdjacentHTML('beforebegin', itemHtml);
  });
  
  totalPriceEl.textContent = formatPrice(totalPrice);

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
       items: cart
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


// --- 5. ЛОГИКА МОДАЛЬНОГО ОКНА (Без изменений) ---
function initModal() {
  const modal = document.getElementById('promo-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  
  closeBtn.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  document.getElementById('modal-add-to-cart-btn').addEventListener('click', () => {
    const { buyItems, giftItem } = getModalSelections();
    
    if (currentModalPromo && buyItems.length > 0 && giftItem) {
      addComplexToCart(currentModalPromo, buyItems, giftItem);
      closeModal();
    } else {
      alert("Ошибка. Не все товары выбраны.");
    }
  });
}
function openModal(promo) {
  currentModalPromo = promo;
  const modal = document.getElementById('promo-modal');
  
  document.getElementById('modal-title').textContent = promo.title;
  document.getElementById('modal-description').textContent = promo.description;
  
  document.getElementById('modal-buy-needed').textContent = promo.buyQuantity;
  document.getElementById('modal-gift-needed').textContent = promo.getQuantity;
  
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
  
  const giftListEl = document.getElementById('modal-gift-list');
  giftListEl.innerHTML = `<p>Выберите ${promo.buyQuantity} товара, чтобы активировать подарки</p>`;
  
  buyListEl.addEventListener('input', updateModalState);
  
  updateModalState();
  modal.style.display = 'flex';
}
function closeModal() {
  const modal = document.getElementById('promo-modal');
  modal.style.display = 'none';
  currentModalPromo = null;
  
  document.getElementById('modal-buy-list').innerHTML = '';
  document.getElementById('modal-gift-list').innerHTML = '';
}
function updateModalState() {
  if (!currentModalPromo) return;

  const { buyQuantity, getQuantity, assortment } = currentModalPromo;
  const { totalBuyQty, totalPrice } = getModalSelections();

  document.getElementById('modal-buy-total').textContent = totalBuyQty;
  
  document.getElementById('modal-total-price').textContent = formatPrice(totalPrice);

  const giftListEl = document.getElementById('modal-gift-list');
  const giftsNeeded = getQuantity;
  let totalGiftQty = 0;
  
  if (totalBuyQty >= buyQuantity) {
    if (!giftListEl.querySelector('.assortment-item')) {
      giftListEl.innerHTML = '';
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
      giftListEl.addEventListener('change', updateModalState);
    }
    
    const selectedGift = giftListEl.querySelector('input[name="gift-selection"]:checked');
    totalGiftQty = selectedGift ? 1 : 0;

  } else {
    giftListEl.innerHTML = `<p>Выберите еще ${buyQuantity - totalBuyQty} товара, чтобы активировать подарки</p>`;
  }
  
  document.getElementById('modal-gift-total').textContent = totalGiftQty;

  const addButton = document.getElementById('modal-add-to-cart-btn');
  const isReady = (totalBuyQty >= buyQuantity) && (totalGiftQty >= giftsNeeded);
  addButton.disabled = !isReady;
}
function getModalSelections() {
  if (!currentModalPromo) return { buyItems: [], giftItem: null, totalBuyQty: 0, totalPrice: 0 };

  let totalBuyQty = 0;
  let totalPrice = 0;
  const buyItems = [];
  
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

  let giftItem = null;
  const giftInput = document.querySelector('.modal-gift-input:checked');
  if (giftInput) {
    const id = giftInput.dataset.id;
    giftItem = currentModalPromo.assortment.find(p => p.id === id);
  }

  return { buyItems, giftItem, totalBuyQty, totalPrice };
}
