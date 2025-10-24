// Имитация ответа от 1С API (Метод 2 из нашего прошлого обсуждения)
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
    promotions: [
      {
        id: "promo-guid-1",
        title: "Препарат 'Филлер X' 1мл",
        description: "Акция 'Свежее лицо': скидка 15%",
        price: 3200
      },
      {
        id: "promo-guid-2",
        title: "Препарат 'Ботулакс' 100 ед.",
        description: "При покупке 2-х упаковок — 3-я в подарок!",
        price: 2800
      },
      {
        id: "promo-guid-3",
        title: "Мезонити 'Super V-Lift' (20 шт)",
        description: "Специальная цена до конца месяца.",
        price: 5500
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
