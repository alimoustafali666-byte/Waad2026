// هوية "وعد" البصرية — مستمدة من شعار التطبيق (الذئب + الفتاة داخل إطار روز-غولد على خلفية عنابية).
// أي شاشة أو مكون جديد في التطبيق يجب أن يستخدم هذه القيم بدل كتابة ألوان مباشرة.

export const colors = {
  // الخلفية العنابية الغامقة من الشعار
  background: "#3B1826",
  backgroundElevated: "#4B2130",
  surface: "#552638",

  // إطار روز-غولد المعدني — اللون المميز الأساسي للعلامة
  gold: "#D9A9A0",
  goldLight: "#F0C9B8",
  goldDark: "#B87F76",

  // وردي فاتح (الورق والقلوب في الشعار) — لون ثانوي للتمييز والتفاعل
  blush: "#F0AFC0",
  blushSoft: "#F7D3DC",

  // نصوص
  textPrimary: "#FBEFEF",
  textMuted: "#D9B8C0",
  textOnGold: "#3B1826",

  // حالات دلالية (منفصلة عن ألوان الهوية)
  success: "#7BC796",
  warning: "#E8B75E",
  danger: "#E06B6B",

  border: "rgba(217, 169, 160, 0.25)",
};

export const gradients = {
  brand: [colors.background, "#5A2438"],
  goldFrame: [colors.goldLight, colors.gold, colors.goldDark],
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 8, md: 14, lg: 22, pill: 999 };

export const typography = {
  display: { fontSize: 32, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "700" },
  body: { fontSize: 15, fontWeight: "400" },
  caption: { fontSize: 12, fontWeight: "500" },
};

export default { colors, gradients, spacing, radius, typography };
