// Имитация ответа от 1С API
function getMockClientData(phone) {
  // В реальном приложении здесь будет API-запрос
  // Сейчас мы просто возвращаем одни и те же данные для любого номера
  
  return {
    clientInfo: {
      clientId: 'mock-client-guid-123',
      name: "Клиника 'Здоровье'",
      recipientName: "Иванова Мария Ивановна", // ФИО для автозаполнения
      defaultAddress: "г. Киев, Новая Почта №15, ул. Крещатик, 1" // Адрес по умолчанию
    },
    // ГЛАВНОЕ ИЗМЕНЕНИЕ: Акции теперь сгруппированы
    promotionsByGroup: [
      {
        groupName: "Космецевтика",
        promotions: [
          {
            id: "promo-esse-1",
            type: "simple_discount", // Простая скидка
            title: "Космецевтика Esse Core",
            description: "Скидка 15% на всю линейку",
            // Для простых акций товар может быть указан прямо здесь
            product: {
              id: "esse-001",
              name: "Esse Core Cleanser C1",
              price: 1200,
              originalPrice: 1412 // Цена до скидки (для красоты)
            }
          }
        ]
      },
      {
        groupName: "Филлеры",
        promotions: [
          {
            id: "promo-neuramis-1",
            type: "buy_x_get_y", // Сложная акция N+1
            title: "Филлер Neuramis (4+1)",
            description: "Выберите 4 филлера в ассортименте и получите 1 в подарок.",
            buyQuantity: 4,
            getQuantity: 1,
            // Товары, участвующие в акции
            assortment: [
              { id: "022", name: "Neuramis Light Lido filler", price: 2500 },
              { id: "023", name: "Neuramis Lido filler", price: 2600 },
              { id: "024", name: "Neuramis Deep filler", price: 2700 },
              { id: "025", name: "Neuramis Deep Lido filler", price: 2800 },
              { id: "026", name: "Neuramis Volume Lido filler", price: 2900 }
            ]
          }
        ]
      },
      {
        groupName: "Коллагеностимуляторы",
        promotions: [
          // Заглушка для примера
           {
            id: "promo-collagen-1",
            type: "simple_discount",
            title: "Gouri (2+1)",
            description: "Скидка 33% (пока не реализовано, просто карточка)",
            product: {
              id: "gouri-001",
              name: "Gouri Stimulator",
              price: 6000,
              originalPrice: 9000
            }
          }
        ]
      }
    ]
  };
};

// Имитация ответа от 1С API (Метод 3)
function createMockOrder(orderData) {
  // Имитируем успешное создание заказа
  console.log("ОТПРАВКА ЗАКАЗА (ИМИТАЦИЯ):", orderData);
  return {
    status: "success",
    orderNumber: `ЗК-${Math.floor(Math.random() * 100000)}`,
    orderDate: new Date().toISOString()
  };
};
