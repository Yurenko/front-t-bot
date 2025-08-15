const API_BASE_URL = "http://localhost:3007";

async function testAPI() {
  try {
    console.log("🔍 Тестування API...");

    // Тест 1: Перевірка доступності сервера
    console.log("\n1. Перевірка доступності сервера...");
    const serverInfo = await fetch(`${API_BASE_URL}/trading/server-info`);
    if (serverInfo.ok) {
      const data = await serverInfo.json();
      console.log("✅ Сервер доступний:", data);
    } else {
      console.log("❌ Сервер недоступний");
      return;
    }

    // Тест 2: Отримання балансу
    console.log("\n2. Отримання балансу...");
    const balanceResponse = await fetch(
      `${API_BASE_URL}/trading/total-balance`
    );
    if (balanceResponse.ok) {
      const balance = await balanceResponse.json();
      console.log("✅ Баланс отримано:", balance);
    } else {
      console.log("❌ Помилка отримання балансу:", balanceResponse.status);
    }

    // Тест 3: Отримання сесій
    console.log("\n3. Отримання сесій...");
    const sessionsResponse = await fetch(`${API_BASE_URL}/trading/sessions`);
    if (sessionsResponse.ok) {
      const sessions = await sessionsResponse.json();
      console.log("✅ Сесії отримано:", sessions.length, "сесій");
    } else {
      console.log("❌ Помилка отримання сесій:", sessionsResponse.status);
    }

    // Тест 4: Отримання символів
    console.log("\n4. Отримання символів...");
    const symbolsResponse = await fetch(
      `${API_BASE_URL}/trading/available-symbols`
    );
    if (symbolsResponse.ok) {
      const symbols = await symbolsResponse.json();
      console.log("✅ Символи отримано:", symbols.length, "символів");
    } else {
      console.log("❌ Помилка отримання символів:", symbolsResponse.status);
    }
  } catch (error) {
    console.error("❌ Помилка тестування API:", error.message);
  }
}

testAPI();
