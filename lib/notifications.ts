import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const MESSAGES = [
  // Fies / Direkt
  "Du liegst noch im Bett? Dein Körper ist peinlich enttäuscht von dir.",
  "Die Kühlschranktür öffnen zählt nicht als Sport. Gym. Jetzt.",
  "Dein Spiegelbild hat heute früh nach dir gefragt. Es war nicht begeistert.",
  "Arnold hätte schon 3 Stunden trainiert. Du weißt was zu tun ist.",
  "Heute wieder Ausreden? Morgen wird der Bauch dankbar sein – du nicht.",
  "Du bezahlst für die App. Nutz sie auch mal.",
  "Deine Couch wird dich vermissen. Geh trainieren.",
  "Ein weiterer Tag ohne Training? Interessante Strategie.",
  "Das Fitnessstudio hat geöffnet. Du weißt wo es ist.",
  "Dein zukünftiges Ich schaut auf dich zurück. Enttäusch es nicht.",
  "Die Muskeln wachsen nicht vom Zuschauen. Nur so als Info.",
  "Selbst deine Oma wäre schon beim Sport. Was ist deine Entschuldigung?",
  "Du hast Zeit für diese Nachricht. Du hast Zeit für Training.",
  "Schweiß ist nur Fett das weint. Lass es weinen.",
  "Das war gestern. Heute zählt. Beweg dich.",

  // Motivierend
  "Kein Schmerz, kein Gewinn. Du weißt was zu tun ist.",
  "Stärke entsteht nicht durch Ruhe, sondern durch Überwindung.",
  "Du bist einen Tag näher an deinem Ziel – aber nur wenn du trainierst.",
  "Champions trainieren auch wenn sie keine Lust haben. Sei ein Champion.",
  "Der einzige schlechte Workout ist der, der nicht stattgefunden hat.",
  "Jede Wiederholung zählt. Fang einfach an.",
  "Dein Körper kann fast alles. Dein Kopf musst du erst überzeugen.",
  "Wer aufhört, besser zu werden, hat aufgehört, gut zu sein.",
  "Die Schmerzen heute sind die Stärken von morgen.",
  "Fortschritt ist Fortschritt, egal wie klein.",
  "Heute hassen, morgen stolz sein.",
  "Du bist nicht müde. Du bist unentschlossen.",
  "Der Unterschied zwischen Können und Wollen ist das Tun.",
  "Starte jetzt. Perfekt kommt später.",
  "Einmal mehr als gestern. Das reicht.",

  // Zitate
  "\"No pain, no gain.\" – Arnold Schwarzenegger",
  "\"Die Stärke kommt nicht aus dem Körper, sondern aus dem Willen der Seele.\" – Gandhi",
  "\"Erfolg ist die Summe kleiner Anstrengungen, die Tag für Tag wiederholt werden.\" – Robert Collier",
  "\"Du musst tun, was du denkst, dass du nicht kannst.\" – Eleanor Roosevelt",
  "\"Der Körper erreicht, was der Geist glaubt.\"",
  "\"Disziplin ist die Brücke zwischen Zielen und Leistung.\" – Jim Rohn",
  "\"Sei nicht der Mann, der wollte. Sei der Mann, der hat.\"",
  "\"Training ist wie Bürsten der Zähne. Wenn du einen Tag aussetzt, merkst du es. Wenn du zwei auslässt, merken es andere.\"",
  "\"Wer aufgibt, gewinnt nichts.\"",
  "\"Der härteste Schritt ist der erste – aus der Tür.\"",

  // Arnold
  "\"Ich bin nicht hier um dein Freund zu sein. Ich bin hier um dich stärker zu machen.\" – Arnold Schwarzenegger",
  "\"Wenn du sagst du kannst nicht, dann lügst du.\" – Arnold Schwarzenegger",
  "\"Die Leute, die sagen es geht nicht – sie sind immer die, die es nicht versucht haben.\" – Arnold Schwarzenegger",
  "\"Schlaf schneller. Wir brauchen das Kissen.\" – Arnold Schwarzenegger",
  "\"Jede Wiederholung, die du abbrichst, ist eine, die dich nicht stärker macht.\" – Arnold Schwarzenegger",
  "\"Niemand hat je gelitten und nichts gewonnen.\" – Arnold Schwarzenegger",
  "\"Du hast sechs Stunden geschlafen? Das sind vier Stunden zu viel.\" – Arnold Schwarzenegger",

  // Mike Tyson
  "\"Jeder hat einen Plan – bis er einen auf die Fresse bekommt.\" – Mike Tyson",
  "\"Disziplin ist tun was du hasst, als ob du es liebst.\" – Mike Tyson",
  "\"Schmerz ist vorübergehend. Ruhm ist für immer.\" – Mike Tyson",

  // David Goggins
  "\"Niemand kommt um dich zu retten. Du bist auf dich allein gestellt.\" – David Goggins",
  "\"Bleib hart.\" – David Goggins",
  "\"Dein Kopf gibt auf, wenn du bei 40% bist. Du hast noch 60%.\" – David Goggins",
  "\"Schmerz schaltet sich aus, wenn Stolz einschaltet.\" – David Goggins",
  "\"Komfortzonen sind Lügen, die du dir selbst erzählst.\" – David Goggins",

  // Kobe / MJ / Ronaldo
  "\"Ruh dich aus wenn du tot bist.\" – Kobe Bryant",
  "\"Herzschmerz ist vorübergehend. Aufgeben ist für immer.\" – Kobe Bryant",
  "\"Talente gewinnen Spiele. Teamwork und Intelligenz gewinnen Meisterschaften.\" – Michael Jordan",
  "\"Ich habe 9000 Würfe in meiner Karriere verfehlt. Das ist warum ich gewinne.\" – Michael Jordan",
  "\"Talent ohne Arbeit ist nur Talent.\" – Cristiano Ronaldo",
  "\"Deine Beine werden müde. Dein Kopf nicht. Das ist der Unterschied.\" – Cristiano Ronaldo",

  // Sonstige Legenden
  "\"Schweig und trainiere.\" – Unbekannt",
  "\"Das Leben ist zu kurz um schwach zu bleiben.\"",
  "\"Andere schlafen. Du trainierst. Das ist der Unterschied.\"",
  "\"Wenn es weh tut, wächst du gerade.\"",
  "\"Die härteste Übung ist die, die du heute weglässt.\"",

  // Witzig
  "Dein Protein-Shake wartet. Geh ihn verdienen.",
  "Heute: Training. Morgen: Muskelkater. Übermorgen: Legende.",
  "Push dich. Niemand anderes wird es tun.",
  "Du hast Zeit für Instagram? Dann hast du Zeit für 30 Minuten Training.",
  "Die Hantelstange ruft deinen Namen. Hörst du sie?",
  "Rückruf von der Zukunft: Du wirst froh sein, dass du heute trainiert hast.",
  "Deine Muskeln machen keinen Urlaub. Warum du?",
  "Legs day. Du wirst es bereuen, wenn du es nicht tust. Du wirst es auch bereuen, wenn du es tust. Mach es.",
  "Heute Training = Heute stolz. Das ist Mathematik.",
  "Bench Press wartet. Du auch. Einer von euch verliert.",
];

export function getRandomMessage(): string {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyNotification(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily', {
      name: 'Tägliche Motivation',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  for (const [hour, minute] of [[10, 0], [19, 0]]) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💪 StayFit',
        body: getRandomMessage(),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

export async function schedulePlannedWorkoutNotification(date: string, time: string | null, name: string): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const [h, m] = (time ?? '08:00').split(':').map(Number);
  const fireDate = new Date(date + 'T00:00:00');
  fireDate.setHours(h, m, 0, 0);
  if (fireDate.getTime() <= Date.now()) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('planned', {
      name: 'Geplante Workouts',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '💪 StayFit — Training steht an',
      body: `Zeit für "${name}"`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
    },
  });
  return id;
}

export async function cancelPlannedWorkoutNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // notification may already have fired or been cancelled
  }
}

export async function sendTestNotification(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  await Notifications.scheduleNotificationAsync({
    content: { title: '💪 StayFit', body: getRandomMessage() },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
}
