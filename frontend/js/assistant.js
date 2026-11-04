/**
 * FitMaster AI – Interactive Nutrition Assistant Chat Bot
 * Provides intelligent nutrition, calorie, macro, and fitness Q&A with
 * real-time typing animation, localStorage history, and user profile personalization.
 */

let conversationHistory = [];
let userProfile = null;

document.addEventListener('DOMContentLoaded', () => {
  loadUserProfileData();
  loadChatHistory();
});

function loadUserProfileData() {
  const saved = localStorage.getItem('fitmaster_profile');
  if (saved) {
    try {
      userProfile = JSON.parse(saved);
      const goalChip = document.getElementById('bot-goal-chip');
      if (goalChip && userProfile.fitness_goal) {
        const goalReadable = userProfile.fitness_goal.replace(/_/g, ' ');
        const cal = userProfile.goals?.daily_calories || 2000;
        goalChip.textContent = `Goal: ${goalReadable} • ${cal} kcal`;
      }
    } catch (e) {
      console.warn('Profile parse error in bot:', e);
    }
  }
}

function loadChatHistory() {
  const saved = localStorage.getItem('fitmaster_bot_chat');
  if (saved) {
    try {
      conversationHistory = JSON.parse(saved);
    } catch {}
  }

  if (conversationHistory.length === 0) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('fitmaster_user') || '{}');
    const name = user?.name ? user.name.split(' ')[0] : 'there';
    const calTarget = userProfile?.goals?.daily_calories || 2000;
    const goalName = userProfile?.fitness_goal ? userProfile.fitness_goal.replace(/_/g, ' ') : 'fitness';

    conversationHistory = [
      {
        sender: 'bot',
        text: `👋 Hello **${name}**! I am your personal **FitMaster AI Bot**.\n\nI am tailored to your **${goalName}** targets (Daily budget: **${calTarget} kcal**).\n\nYou can ask me anything about:\n* Daily protein & macronutrient needs\n* High-protein meal suggestions (Indian & global)\n* Pre & post workout nutrition timing\n* Fat loss strategies & breaking plateaus\n* Calorie deficits, maintenance, & healthy hydration\n\nClick any quick prompt above or type your question below!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    saveChatHistory();
  }

  renderMessages();
}

function saveChatHistory() {
  localStorage.setItem('fitmaster_bot_chat', JSON.stringify(conversationHistory));
}

function renderMessages() {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('fitmaster_user') || '{}');
  const userInitials = user?.name ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'ME';

  container.innerHTML = conversationHistory.map((msg) => {
    const isUser = msg.sender === 'user';
    const formattedText = formatMarkdown(msg.text);

    return `
      <div class="message-row ${isUser ? 'user' : 'bot'}">
        <div class="msg-avatar ${isUser ? 'user-av' : 'bot-av'}">
          ${isUser ? userInitials : '🤖'}
        </div>
        <div class="msg-bubble">
          <div>${formattedText}</div>
          <div style="font-size: 10px; color: ${isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-dim)'}; margin-top: 6px; text-align: ${isUser ? 'right' : 'left'};">
            ${msg.time || ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

/**
 * Basic markdown parser for bold, lists, and line breaks
 */
function formatMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet points
  const lines = html.split('\n');
  let inList = false;
  let formattedLines = [];

  for (let line of lines) {
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      if (!inList) {
        formattedLines.push('<ul>');
        inList = true;
      }
      formattedLines.push(`<li>${line.trim().substring(2)}</li>`);
    } else {
      if (inList) {
        formattedLines.push('</ul>');
        inList = false;
      }
      formattedLines.push(line);
    }
  }
  if (inList) formattedLines.push('</ul>');

  return formattedLines.join('<br>').replace(/<br><ul>/g, '<ul>').replace(/<\/ul><br>/g, '</ul>');
}

/**
 * Handle form submission
 */
window.handleChatSubmit = async function(e) {
  e.preventDefault();
  const input = document.getElementById('chat-user-input');
  const question = input.value.trim();
  if (!question) return;

  input.value = '';
  await processUserMessage(question);
};

window.askQuickPrompt = async function(promptText) {
  await processUserMessage(promptText);
};

async function processUserMessage(question) {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Add user message
  conversationHistory.push({
    sender: 'user',
    text: question,
    time: timeStr
  });
  renderMessages();
  saveChatHistory();

  // Show typing indicator
  showTyping(true);

  // Generate bot reply after short realistic delay
  setTimeout(async () => {
    const answer = await generateSmartNutritionReply(question);
    showTyping(false);

    conversationHistory.push({
      sender: 'bot',
      text: answer,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    renderMessages();
    saveChatHistory();
  }, 650);
}

function showTyping(show) {
  const typing = document.getElementById('typing-indicator-container');
  const container = document.getElementById('chat-messages-container');
  if (typing) {
    typing.style.display = show ? 'block' : 'none';
  }
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

window.clearChatHistory = function() {
  localStorage.removeItem('fitmaster_bot_chat');
  conversationHistory = [];
  loadChatHistory();
  showToast('Chat Cleared', 'Conversation history reset.', 'info');
};

/**
 * Knowledge-based smart nutrition response generator
 */
async function generateSmartNutritionReply(q) {
  const query = q.toLowerCase();
  const weight = userProfile?.weight_kg || 70;
  const goal = userProfile?.fitness_goal || 'weight_maintenance';
  const calTarget = userProfile?.goals?.daily_calories || 2000;
  const proteinTarget = userProfile?.goals?.protein_g || Math.round(weight * 2.0);

  // 1. Protein inquiries
  if (query.includes('protein') && (query.includes('how much') || query.includes('need') || query.includes('daily') || query.includes('muscle'))) {
    return `To support muscle preservation and hypertrophy, current scientific sports nutrition consensus recommends **1.6g to 2.2g of protein per kg of bodyweight**.\n\n* **Your Personalized Target:** Based on your current weight of **${weight} kg**, aim for **${proteinTarget}g of protein per day**.\n* **Distribution:** Split this into 3-4 meals containing ~25-40g each for optimal Muscle Protein Synthesis (MPS).\n* **Top Sources:** Chicken breast (31g/100g), Greek yogurt (10g/100g), Whey protein isolate (25g/scoop), Low-fat Paneer (25g/100g), Eggs (6g/egg), and Moong Dal (9g/100g cooked).`;
  }

  // 2. Indian vegetarian protein
  if (query.includes('veg') || query.includes('vegetarian') || query.includes('indian')) {
    return `Here are top **high-protein Indian vegetarian foods** and smart meal combinations:\n\n* **Low-Fat Paneer / Cottage Cheese:** 25g protein per 100g (low lactose, high leucine)\n* **Soya Chunks / Meal Maker:** 52g protein per 100g dry weight (complete amino acid profile)\n* **Yellow Moong & Masoor Dal:** Pair dal with brown rice or roti for complete complementary amino acids\n* **Greek Yogurt / Hung Curd:** 10g protein per 100g with natural probiotics\n* **Sprouted Chickpeas & Kala Chana:** Rich in fiber and plant protein (~15g protein per cup cooked)\n* **Tofu & Edamame:** Ideal low-calorie plant proteins\n\n💡 **Meal Idea:** 150g grilled paneer bhurji with 2 whole wheat rotis and a bowl of fresh cucumber-tomato salad (~480 kcal, 36g protein).`;
  }

  // 3. Pre and Post Workout Nutrition
  if (query.includes('workout') || query.includes('pre') || query.includes('post') || query.includes('gym')) {
    return `Timing your meals around training optimizes performance and speeds up recovery:\n\n* **Pre-Workout (1-2 hours before):** Focus on easily digestible complex carbohydrates with moderate protein.\n  * Examples: Oatmeal with banana & whey scoop, or 2 slices whole grain bread with peanut butter and fruit (~250-350 kcal).\n* **During Training:** Hydration is key! Sip on water (500-750 ml) with a pinch of salt or electrolytes if training exceeds 60 minutes.\n* **Post-Workout (Within 1-2 hours):** Prioritize fast-acting protein and carbohydrates to replenish glycogen and repair muscle fibers.\n  * Examples: 1 scoop Whey isolate + 1 large banana (or rice cakes), or grilled chicken/tofu with steamed rice (~30g protein).`;
  }

  // 4. Weight loss plateau
  if (query.includes('plateau') || query.includes('stuck') || (query.includes('weight') && query.includes('not losing'))) {
    return `Weight plateaus are a completely natural biological response to caloric restriction (metabolic adaptation). Here is how to break through:\n\n* **Audit Portion Creep:** Use our Food Tracker and a kitchen scale for 3 days to verify exact portion weights in grams ($g$). Hidden oils, dressings, and snacks often account for 200-400 unintended calories.\n* **Increase NEAT (Daily Movement):** Non-Exercise Activity Thermogenesis (walking, taking stairs) often dips when in a deficit. Target 8,000–10,000 steps daily.\n* **Take a 2-Day Diet Break:** Eat at your maintenance calories (**${calTarget + (goal === 'weight_loss' ? 500 : 0)} kcal**) for 48 hours to down-regulate cortisol and boost leptin levels.\n* **Check Water Retention:** Increased muscle soreness or higher sodium intake causes temporary fluid retention that masks true fat loss on the scale.`;
  }

  // 5. Low-calorie snacks
  if (query.includes('snack') || query.includes('cravings') || query.includes('night') || query.includes('low calorie')) {
    return `Here are satisfying snacks **under 150-200 calories** packed with volume and protein:\n\n* **Spiced Roasted Makhana (Foxnuts):** 30g roasted in 1/2 tsp olive oil with chaat masala (~120 kcal, high volume)\n* **Apple Slices with Cinnamon & Salt:** 1 medium apple + sprinkle of cinnamon (~85 kcal)\n* **Boiled Egg Whites with Pepper:** 3 egg whites (~52 kcal, 11g pure protein)\n* **Greek Yogurt with Berries:** 120g non-fat Greek yogurt + 40g fresh strawberries (~95 kcal, 12g protein)\n* **Steamed Edamame in Pods:** 100g with sea salt (~120 kcal, 11g protein, rich in fiber)\n* **Cucumber & Carrot Sticks with Hummus:** 2 tbsp hummus + cucumber slices (~100 kcal).`;
  }

  // 6. Water and Hydration
  if (query.includes('water') || query.includes('drink') || query.includes('hydration') || query.includes('fluid')) {
    const recommendedWater = Math.round(weight * 35);
    return `Optimal hydration is essential for digestion, muscle protein synthesis, and metabolic rate:\n\n* **Daily Target for You:** At **${weight} kg**, your baseline fluid requirement is approximately **${recommendedWater} ml (${(recommendedWater / 1000).toFixed(1)} Liters)** per day (calculated at ~35ml/kg).\n* **Exercise Adjustment:** Add 350–500 ml for every 45 minutes of vigorous exercise or hot weather.\n* **Hydration Tip:** Drink 1 full glass (250ml) immediately upon waking to rehydrate after 7-8 hours of sleep. Track your intake on our interactive **Water Tracker**!`;
  }

  // 7. Maintenance and calorie deficit
  if (query.includes('deficit') || query.includes('maintenance') || query.includes('tdee') || query.includes('bmr') || query.includes('calculate')) {
    return `Here is how caloric balance works mathematically:\n\n* **Basal Metabolic Rate (BMR):** The energy your body burns at complete rest for vital organ function (Mifflin-St Jeor formula).\n* **Total Daily Energy Expenditure (TDEE):** Your BMR multiplied by your physical activity factor (1.2 for sedentary to 1.725 for very active).\n* **Healthy Fat Loss Deficit:** A safe, sustainable deficit is **-500 kcal/day**, which mathematically creates an energy deficit of 3,500 kcal per week (~0.45 kg / 1 lb of fat loss weekly) while preserving lean muscle mass.\n* **Muscle Gain Surplus:** A controlled surplus of **+300 to +350 kcal/day** minimizes excess fat gain while maximizing lean tissue growth.`;
  }

  // 8. Low-carb / Keto / Intermittent fasting
  if (query.includes('keto') || query.includes('carb') || query.includes('fasting') || query.includes('intermittent')) {
    return `Here is what the evidence shows regarding popular dietary protocols:\n\n* **Intermittent Fasting (16:8):** An effective timing strategy to control total daily calorie intake and improve insulin sensitivity. However, weight loss occurs due to the overall calorie deficit, not magic fasting hours.\n* **Low-Carb / Keto:** Helpful for individuals with insulin resistance or those who prefer fats/proteins. Note that initial rapid scale drop is largely water weight (each gram of stored glycogen binds 3-4g of water).\n* **Takeaway:** The most effective diet is the one you can stick to consistently that meets your daily protein target (**${proteinTarget}g**) and stays within your caloric budget (**${calTarget} kcal**).`;
  }

  // Default helpful response
  return `Great question! Here is a focused guideline based on your **${goal.replace(/_/g, ' ')}** goal:\n\n* **Caloric Target:** Maintain consistency around your daily target of **${calTarget} kcal**.\n* **Macronutrient Balance:** Aim for **${proteinTarget}g Protein** daily, keeping healthy dietary fats at 20-30% of your intake and filling the rest with complex fiber-rich carbohydrates.\n* **Consistency Over Perfection:** Tracking your daily meals and fluids in FitMaster AI for 14 straight days creates lasting nutritional habits.\n\nWould you like specific high-protein meal combinations, workout timing tips, or calorie budget suggestions? Feel free to ask!`;
}
