/**
 * Seed script — Tados Web
 *
 * Builds the category tree, brands, and the 10 product lines from the
 * supplied "Items and functions" sheet. Idempotent: safe to re-run.
 *
 *   npm run db:seed
 */

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Placeholder imagery. Replace the files in /public/products with the real
// manufacturer photos — filenames are referenced here so nothing else changes.
const img = (name: string) => `/products/${name}`;

interface SeedProduct {
  name: string;
  slug: string;
  sku: string;
  tagline: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  costPrice: number;
  stock: number;
  categorySlug: string;
  brand: string;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  ratingAvg: number;
  ratingCount: number;
  features: string[];
  specs: Record<string, string>;
  images: string[];
}

const CATEGORIES = [
  {
    name: "Smart Locks",
    slug: "smart-locks",
    icon: "Lock",
    image: img("cat-smart-locks.jpg"),
    description:
      "Keyless entry for homes, offices and estates — facial recognition, fingerprint, PIN, RFID and app control with mechanical key backup.",
    children: [
      {
        name: "Facial Recognition Locks",
        slug: "facial-recognition-locks",
        icon: "ScanFace",
        image: img("cat-facial-recognition.jpg"),
        description:
          "3D face unlock in 1–2 seconds, works in low light, with anti-spoof protection that rejects photos and video.",
      },
      {
        name: "Fingerprint Door Locks",
        slug: "fingerprint-door-locks",
        icon: "Fingerprint",
        image: img("cat-fingerprint-locks.jpg"),
        description:
          "Semiconductor 360° fingerprint sensors with multi-user registration, access history and auto-lock.",
      },
      {
        name: "Gate & JAM Locks",
        slug: "gate-jam-locks",
        icon: "DoorClosed",
        image: img("cat-gate-locks.jpg"),
        description:
          "Heavy-duty remote-controlled locking for entrance gates, apartment blocks and commercial doors.",
      },
    ],
  },
  {
    name: "Padlocks & Portable Security",
    slug: "padlocks-portable-security",
    icon: "KeyRound",
    image: img("cat-padlocks.jpg"),
    description:
      "Take your security with you — biometric padlocks and smart U-locks for bikes, lockers, storage and outdoor equipment.",
    children: [
      {
        name: "Fingerprint Padlocks",
        slug: "fingerprint-padlocks",
        icon: "Fingerprint",
        image: img("cat-fingerprint-padlocks.jpg"),
        description:
          "Unlock in under a second with hardened steel shackles, weather resistance and app-managed users.",
      },
      {
        name: "Smart U-Locks",
        slug: "smart-u-locks",
        icon: "Bike",
        image: img("cat-u-locks.jpg"),
        description:
          "GPS-tracked bicycle and scooter U-locks with tamper alarms, geofencing and Bluetooth unlocking.",
      },
    ],
  },
  {
    name: "Alarms & Detection",
    slug: "alarms-detection",
    icon: "ShieldAlert",
    image: img("cat-alarms.jpg"),
    description:
      "Detect intrusion, smoke and gas early — with instant push alerts wherever you are.",
    children: [
      {
        name: "Security Alarm Systems",
        slug: "security-alarm-systems",
        icon: "Siren",
        image: img("cat-alarm-systems.jpg"),
        description:
          "Complete kits with door/window contacts, motion sensors, sirens and remote arm/disarm from your phone.",
      },
      {
        name: "Smoke & Gas Detectors",
        slug: "smoke-gas-detectors",
        icon: "Flame",
        image: img("cat-smoke-detectors.jpg"),
        description:
          "Interconnected smart smoke alarms with self-testing, low-battery alerts and smartphone notifications.",
      },
    ],
  },
  {
    name: "Smart Home Automation",
    slug: "smart-home-automation",
    icon: "House",
    image: img("cat-automation.jpg"),
    description:
      "Wi-Fi and Zigbee devices that automate lighting, curtains and daily routines — with Alexa and Google Assistant support.",
    children: [
      {
        name: "Smart Switches",
        slug: "smart-switches",
        icon: "ToggleRight",
        image: img("cat-switches.jpg"),
        description:
          "Wi-Fi switches for simple setups and Zigbee mesh switches for large homes with many devices.",
      },
      {
        name: "Smart Curtain Kits",
        slug: "smart-curtain-kits",
        icon: "Blinds",
        image: img("cat-curtains.jpg"),
        description:
          "Motorised curtain tracks with scheduling, voice control and manual-pull override.",
      },
    ],
  },
  {
    name: "Audio",
    slug: "audio",
    icon: "Speaker",
    image: img("cat-audio.jpg"),
    description:
      "Discreet in-ceiling speakers with Wi-Fi and Bluetooth streaming, multi-room grouping and TV audio input.",
    children: [
      {
        name: "Ceiling Speakers",
        slug: "ceiling-speakers",
        icon: "Speaker",
        image: img("cat-ceiling-speakers.jpg"),
        description:
          "Wi-Fi/Bluetooth in-ceiling speakers for homes, restaurants, hotels and retail spaces.",
      },
    ],
  },
];

const BRANDS = ["Tados", "Tuya", "Aqara", "Hikvision", "Sonoff"];

const PRODUCTS: SeedProduct[] = [
  {
    name: "Smart 3D Facial Recognition Door Lock",
    slug: "smart-3d-facial-recognition-door-lock",
    sku: "TDS-FR-001",
    tagline:
      "Hands-free 3D face unlock in under 2 seconds, with five backup access methods.",
    description:
      "A complete smart access control system that combines 3D facial recognition, mobile app control and multiple backup unlocking methods. The 3D sensor unlocks in 1–2 seconds, works in low light, and uses anti-spoof technology that rejects photographs and video. Add fingerprints, PINs, RFID cards or the Tuya Smart app, and keep a mechanical key as an emergency fallback.\n\nManage everyone who enters from your phone: create administrator accounts, add family members, domestic workers or office staff, issue temporary passwords for guests, and restrict access by date and time. Recurring schedules make it simple — a cleaner on Mondays 09:00–14:00, a gardener on Saturdays only, or an Airbnb guest limited to their check-in and check-out dates.\n\nSecurity features include auto-lock after closing, anti-tamper and anti-pry alarms, incorrect-PIN lockout, low battery warnings, a C-grade lock cylinder and emergency USB-C power input.",
    price: 6499,
    compareAtPrice: 7999,
    costPrice: 4100,
    stock: 24,
    categorySlug: "facial-recognition-locks",
    brand: "Tados",
    isFeatured: true,
    isBestseller: true,
    ratingAvg: 4.8,
    ratingCount: 213,
    features: [
      "3D face recognition unlocks in 1–2 seconds, works in low light",
      "Anti-spoof technology rejects photographs and video",
      "360° semiconductor fingerprint sensor with multi-user support",
      "Permanent, temporary, one-time and scheduled PINs with anti-peep entry",
      "RFID/IC card unlocking — easy for children and elderly users",
      "Remote lock, unlock and status via the Tuya Smart / Smart Life app",
      "Real-time notifications and full unlock history",
      "Auto-lock after closing, anti-tamper and anti-pry alarms",
      "Emergency USB-C power input plus mechanical key backup",
    ],
    specs: {
      "Unlock methods":
        "3D face, fingerprint, PIN, RFID card, app, mechanical key",
      "Face capacity": "50 users",
      "Fingerprint capacity": "100 users",
      Connectivity: "Wi-Fi 2.4GHz + Bluetooth",
      App: "Tuya Smart / Smart Life",
      Power: "8 × AA batteries, USB-C emergency input",
      "Battery life": "8–12 months typical use",
      "Lock cylinder": "C-grade anti-drill",
      "Door thickness": "40–120mm",
      Warranty: "2 years",
    },
    images: [
      img("facial-lock-1.jpg"),
      img("facial-lock-2.jpg"),
      img("facial-lock-3.jpg"),
      img("facial-lock-4.jpg"),
    ],
  },
  {
    name: "Smart U-Lock with GPS Tracking",
    slug: "smart-u-lock-gps-tracking",
    sku: "TDS-UL-002",
    tagline:
      "Hardened steel shackle, tamper alarm and live GPS tracking for bikes and scooters.",
    description:
      "A smart U-lock that combines physical security with digital tracking. The hardened steel shackle resists cutting, prying, drilling and leverage attacks, while the electronics add keyless unlocking, tamper detection and location tracking.\n\nUnlock via Bluetooth from your phone, an NFC card, the keypad PIN, or the backup mechanical key. Built-in sensors detect vibration, movement, forced entry and cutting, triggering the alarm immediately. GPS tracking shows the lock's live position in the app if your bike is stolen, and geofencing notifies you the moment it leaves your safe parking area.\n\nDesigned for outdoor use: water-resistant, dust-resistant and corrosion-resistant, with a USB-C rechargeable battery and low-power security mode that keeps locking and alarm functions alive when the battery runs low.",
    price: 2899,
    compareAtPrice: 3499,
    costPrice: 1750,
    stock: 41,
    categorySlug: "smart-u-locks",
    brand: "Tados",
    isBestseller: true,
    isNewArrival: true,
    ratingAvg: 4.6,
    ratingCount: 128,
    features: [
      "Hardened steel U-shackle resists cutting, prying and drilling",
      "Keyless unlocking via Bluetooth, NFC card, PIN or backup key",
      "Tamper detection for vibration, movement, impact and cutting",
      "Live GPS tracking with location history in the app",
      "Geofencing alerts when the lock leaves your safe zone",
      "Multi-user access with temporary or permanent digital keys",
      "USB-C rechargeable with battery level monitoring",
      "Weather, dust and corrosion resistant for outdoor use",
      "Low-power security mode keeps alarms active on low battery",
    ],
    specs: {
      "Shackle material": "Hardened alloy steel",
      "Shackle diameter": "18mm",
      "Unlock methods": "Bluetooth app, NFC, PIN keypad, mechanical key",
      Tracking: "GPS + GSM cellular",
      Alarm: "110dB siren",
      "Water rating": "IP65",
      Battery: "3000mAh USB-C rechargeable",
      "Battery life": "Up to 6 months standby",
      Applications: "Bicycles, e-bikes, motorcycles, scooters, gates",
      Warranty: "2 years",
    },
    images: [img("u-lock-1.jpg"), img("u-lock-2.jpg"), img("u-lock-3.jpg")],
  },
  {
    name: "Smart JAM Lock for Gates & Doors",
    slug: "smart-jam-lock-gates-doors",
    sku: "TDS-JM-003",
    tagline:
      "Remote-controlled keyless locking built for entrance gates and commercial doors.",
    description:
      "Secure, convenient and remote-controlled locking for gates and doors. The JAM lock unlocks with a PIN code, fingerprint, RFID card or tag, the smartphone app, or Bluetooth — no traditional keys required.\n\nAdministrators create, manage or revoke access for family members, employees, tenants and visitors, and can assign temporary or scheduled codes. Real-time notifications fire when the lock is opened, closed or tampered with, and a full access log records who entered and when for accountability.\n\nAutomatic locking engages after the gate or door closes, so nothing is left open by accident. Tamper alarms, forced-entry detection, low-battery alerts, emergency backup power and a mechanical key override round out the security. Integrates with CCTV cameras, alarms, intercoms and smart home platforms.",
    price: 4299,
    costPrice: 2650,
    stock: 18,
    categorySlug: "gate-jam-locks",
    brand: "Tados",
    isFeatured: true,
    ratingAvg: 4.5,
    ratingCount: 76,
    features: [
      "Keyless entry via PIN, fingerprint, RFID card/tag, app or Bluetooth",
      "Remote locking and unlocking from anywhere",
      "Temporary and scheduled access codes for tenants and visitors",
      "Real-time open, close and tamper notifications",
      "Full access log of who entered and when",
      "Automatic locking after the gate or door closes",
      "Tamper alarms and forced-entry detection",
      "Integrates with CCTV, alarms, intercoms and smart home platforms",
      "Emergency backup power and mechanical key override",
    ],
    specs: {
      "Unlock methods": "PIN, fingerprint, RFID, app, Bluetooth, key",
      Connectivity: "Wi-Fi 2.4GHz + Bluetooth 5.0",
      "User capacity": "200 users",
      Applications:
        "Residential gates, apartment doors, offices, industrial sites",
      Power: "Rechargeable battery + DC input",
      Integration: "CCTV, intercom, Tuya, alarm panels",
      Warranty: "2 years",
    },
    images: [img("jam-lock-1.jpg"), img("jam-lock-2.jpg"), img("jam-lock-3.jpg")],
  },
  {
    name: "Fingerprint Smart Door Lock",
    slug: "fingerprint-smart-door-lock",
    sku: "TDS-FP-004",
    tagline:
      "Biometric entry for homes, offices and rentals — with app control and auto-lock.",
    description:
      "An electronic lock that uses biometric fingerprint recognition to let authorised users in without a traditional key. Scan a registered fingerprint for quick, secure access, or fall back on PIN codes, RFID cards, the smartphone app, or the mechanical backup key.\n\nStore fingerprints for multiple users, which makes it well suited to families, offices and rental properties. Administrators add or delete users as people join or leave, assign different permissions, and grant temporary access to specific users. Access history records who entered and at what time for security monitoring.\n\nAuto-lock engages after the door closes, remote lock/unlock works from anywhere via the app, and tamper alarms, forced-entry alerts and low-battery warnings keep you informed. Emergency USB power gets you in if the batteries die.",
    price: 3799,
    compareAtPrice: 4499,
    costPrice: 2300,
    stock: 36,
    categorySlug: "fingerprint-door-locks",
    brand: "Tuya",
    isBestseller: true,
    isFeatured: true,
    ratingAvg: 4.7,
    ratingCount: 189,
    features: [
      "Fingerprint unlocking for quick, secure keyless access",
      "Also supports PIN, RFID card, app and mechanical key",
      "Multiple user registration for families, offices and rentals",
      "Easy user management — add or delete users instantly",
      "Assign permissions and temporary access per user",
      "Access history showing who entered and when",
      "Auto-lock after the door closes",
      "Remote lock and unlock from anywhere via the app",
      "Tamper alarms, forced-entry alerts and low-battery warnings",
    ],
    specs: {
      "Unlock methods": "Fingerprint, PIN, RFID, app, mechanical key",
      "Fingerprint capacity": "100 users",
      Sensor: "Semiconductor, 360° recognition",
      "Unlock speed": "< 1 second",
      Connectivity: "Wi-Fi + Bluetooth",
      Power: "4 × AA batteries, USB emergency input",
      "Door thickness": "35–100mm",
      Warranty: "2 years",
    },
    images: [
      img("fingerprint-lock-1.jpg"),
      img("fingerprint-lock-2.jpg"),
      img("fingerprint-lock-3.jpg"),
    ],
  },
  {
    name: "Smart Security Alarm System Kit",
    slug: "smart-security-alarm-system-kit",
    sku: "TDS-AL-005",
    tagline:
      "Complete intrusion detection with 24/7 monitoring and instant phone alerts.",
    description:
      "A complete smart alarm system that protects homes and businesses by detecting threats, alerting you instantly and allowing remote monitoring and control. Door and window contacts plus motion detectors catch unauthorised entry and trigger the alarm the moment a breach happens.\n\nMonitor the property around the clock — self-monitor from your phone or connect to a professional monitoring service. Instant notifications arrive by app, SMS or email when an alarm triggers or unusual activity is detected. Arm and disarm remotely from a phone, tablet or computer, and check system status from anywhere with an internet connection.\n\nConnect security cameras for live video and recorded footage so you can verify alarms visually. Add compatible sensors for smoke, fire, carbon monoxide or gas leaks. The system integrates with smart locks for remote access control and with smart home devices to automate lights and sirens, or simulate occupancy while the property is empty.",
    price: 5299,
    compareAtPrice: 6499,
    costPrice: 3200,
    stock: 15,
    categorySlug: "security-alarm-systems",
    brand: "Hikvision",
    isFeatured: true,
    isNewArrival: true,
    ratingAvg: 4.7,
    ratingCount: 94,
    features: [
      "Intrusion detection via door/window contacts and motion sensors",
      "24/7 monitoring — self-monitor or use a professional service",
      "Real-time alerts by app, SMS and email",
      "Arm and disarm remotely from phone, tablet or computer",
      "Camera integration for live feed and recorded footage",
      "Optional smoke, fire, CO and gas leak sensors",
      "Automatic emergency contact notification",
      "Integrates with smart locks and temporary visitor codes",
      "Occupancy simulation and automated lights and sirens",
      "Event logging with full activity history",
    ],
    specs: {
      "Kit contents":
        "Hub, 2 × door/window sensors, 1 × PIR motion sensor, siren, 2 × remotes",
      Connectivity: "Wi-Fi + GSM backup",
      Siren: "120dB",
      "Sensor range": "Up to 100m open field",
      "Expandable to": "100 sensors",
      "Backup battery": "Up to 12 hours",
      App: "Smart Life / Tuya",
      Warranty: "2 years",
    },
    images: [img("alarm-1.jpg"), img("alarm-2.jpg"), img("alarm-3.jpg")],
  },
  {
    name: "Smart Fingerprint Padlock",
    slug: "smart-fingerprint-padlock",
    sku: "TDS-PL-006",
    tagline: "Opens in half a second with your thumb. No keys to lose.",
    description:
      "A compact electronic padlock that uses biometric fingerprint recognition alongside a traditional key backup. Registered fingerprints unlock it in 0.5–1 second, giving you keyless convenience wherever you need it.\n\nStore multiple fingerprints so family members, employees or teammates can all get access. Biometric data is encrypted to prevent unauthorised access, and there are no keys to lose or copy. The app lets you add or remove fingerprints, view unlock history, share temporary access and check battery status.\n\nBuilt for real conditions: water- and dust-resistant with a hardened steel shackle that resists cutting and tampering. Low-battery warnings give you plenty of notice, and the charging port can temporarily power the lock if the battery is fully drained.",
    price: 1249,
    compareAtPrice: 1599,
    costPrice: 680,
    stock: 87,
    categorySlug: "fingerprint-padlocks",
    brand: "Tados",
    isBestseller: true,
    ratingAvg: 4.5,
    ratingCount: 302,
    features: [
      "Fingerprint unlocking in 0.5–1 second",
      "Stores multiple fingerprints for shared access",
      "Encrypted biometric data — no keys to lose or copy",
      "Hardened steel shackle resists cutting and tampering",
      "Water- and dust-resistant for outdoor use",
      "App control: add/remove prints, view history, share access",
      "Low battery warning with emergency power via charging port",
    ],
    specs: {
      "Unlock methods": "Fingerprint, app",
      "Fingerprint capacity": "20 users",
      "Unlock speed": "0.5–1 second",
      "Shackle material": "Hardened steel",
      "Water rating": "IP65",
      Battery: "Built-in rechargeable, USB-C",
      "Battery life": "Up to 12 months / 3000 unlocks",
      Applications:
        "Lockers, gates, storage units, luggage, toolboxes, gyms, schools",
      Warranty: "1 year",
    },
    images: [img("padlock-1.jpg"), img("padlock-2.jpg"), img("padlock-3.jpg")],
  },
  {
    name: "Smart Wi-Fi & Bluetooth Ceiling Speakers (Pair)",
    slug: "smart-wifi-bluetooth-ceiling-speakers",
    sku: "TDS-SP-007",
    tagline:
      "Invisible audio with multi-room grouping, voice control and TV input.",
    description:
      "In-ceiling speakers that deliver discreet, high-quality audio while integrating with your wireless network and smart home. They look like traditional in-ceiling speakers but add modern connectivity and control.\n\nStream from Spotify, Apple Music, YouTube Music and Amazon Music over Wi-Fi for better range and higher audio quality, or connect directly over Bluetooth when guests visit or internet isn't available. Multi-room audio plays the same music everywhere or different music in each room, grouped and controlled from the app.\n\nWorks with Amazon Alexa, Google Assistant and Apple Siri via AirPlay, so you can play, pause, skip and adjust volume by voice. The companion app handles source selection, speaker groups, EQ (bass, treble, balance), per-room volume and firmware updates. Connect a TV, media player or home theatre system to use them as TV speakers or surround channels.\n\nCommonly installed in living rooms, kitchens, bedrooms, bathrooms and covered patios, as well as restaurants, hotels, offices, retail stores, cafés and conference rooms for evenly distributed background music.",
    price: 4899,
    costPrice: 2950,
    stock: 22,
    categorySlug: "ceiling-speakers",
    brand: "Tados",
    isFeatured: true,
    isNewArrival: true,
    ratingAvg: 4.6,
    ratingCount: 67,
    features: [
      "Wi-Fi streaming from Spotify, Apple Music, YouTube Music, Amazon Music",
      "Direct Bluetooth playback when Wi-Fi isn't available",
      "Multi-room audio — same or different music per room",
      "Voice control with Alexa, Google Assistant and Siri/AirPlay",
      "App-based EQ, speaker grouping and per-room volume",
      "TV, media player and home theatre audio input",
      "Moisture-resistant models suitable for bathrooms and patios",
      "Firmware updates over the air",
    ],
    specs: {
      Configuration: "Pair of 6.5\" 2-way in-ceiling speakers",
      "Power output": "2 × 40W RMS",
      "Frequency response": "45Hz – 20kHz",
      Connectivity: "Wi-Fi 2.4/5GHz, Bluetooth 5.0, AirPlay 2, line-in",
      "Voice assistants": "Alexa, Google Assistant, Siri",
      "Cut-out diameter": "200mm",
      "Moisture rating": "IP44",
      Warranty: "2 years",
    },
    images: [
      img("ceiling-speaker-1.jpg"),
      img("ceiling-speaker-2.jpg"),
      img("ceiling-speaker-3.jpg"),
    ],
  },
  {
    name: "Smart Wi-Fi Switch",
    slug: "smart-wifi-switch",
    sku: "TDS-SW-008",
    tagline:
      "The simplest way to start — connects straight to your router, no hub needed.",
    description:
      "A smart switch that connects directly to your home Wi-Fi router, with no additional hub required. Control your lights and appliances on and off from the mobile app, wherever you are.\n\nScheduling turns lights on at sunset automatically, and routines can switch things on when you arrive home. Works with Amazon Alexa, Google Assistant and Apple Siri for voice control.\n\nBest suited to small homes and apartments, users who want easy installation without an extra hub, and homes with only a few smart devices. Note that it needs a strong Wi-Fi signal at the point of installation.",
    price: 549,
    compareAtPrice: 699,
    costPrice: 280,
    stock: 156,
    categorySlug: "smart-switches",
    brand: "Sonoff",
    isBestseller: true,
    ratingAvg: 4.4,
    ratingCount: 418,
    features: [
      "Connects directly to your Wi-Fi router — no hub required",
      "On/off control from the mobile app anywhere",
      "Scheduling, e.g. lights on at sunset",
      "Arrival and departure routines",
      "Works with Alexa, Google Assistant and Siri",
      "Simple installation for small homes and apartments",
    ],
    specs: {
      Protocol: "Wi-Fi 2.4GHz",
      "Hub required": "No",
      Gangs: "1 / 2 / 3 gang options",
      "Max load": "10A per gang",
      "Neutral wire": "Required",
      "Voice assistants": "Alexa, Google Assistant, Siri",
      "Best for": "Small homes and apartments with few smart devices",
      Warranty: "2 years",
    },
    images: [img("wifi-switch-1.jpg"), img("wifi-switch-2.jpg")],
  },
  {
    name: "Smart Zigbee Switch",
    slug: "smart-zigbee-switch",
    sku: "TDS-SW-009",
    tagline:
      "Mesh networking, fast local control and automations that work without internet.",
    description:
      "A Zigbee switch that connects to a Zigbee hub rather than directly to Wi-Fi, communicating over low-power Zigbee wireless. Powered Zigbee devices relay signals to form a mesh network, which extends range across large properties.\n\nResponse times are very fast, and advanced automations can link Zigbee sensors, switches and lights together. Depending on your hub, many automations keep running even when the internet is unavailable — local control that doesn't depend on the cloud. One Zigbee network supports hundreds of devices.\n\nChoose Zigbee if you're building a comprehensive smart home with many devices, sensors and automations, or if you value reliable, low-latency local control. If you only need a few switches and want the simplest setup, our Wi-Fi switch is the easier starting point.",
    price: 649,
    costPrice: 340,
    stock: 132,
    categorySlug: "smart-switches",
    brand: "Aqara",
    ratingAvg: 4.6,
    ratingCount: 236,
    features: [
      "Low-power Zigbee mesh networking for extended range",
      "Very fast response times with local control",
      "Advanced automations between Zigbee sensors, switches and lights",
      "Many automations keep working without internet",
      "Supports hundreds of devices on one Zigbee network",
      "Ideal for large homes with many smart devices",
    ],
    specs: {
      Protocol: "Zigbee 3.0",
      "Hub required": "Yes — Zigbee hub",
      Gangs: "1 / 2 / 3 gang options",
      "Max load": "10A per gang",
      Networking: "Self-healing mesh via powered devices",
      "Device limit": "Hundreds per network",
      "Best for": "Large homes and comprehensive smart home builds",
      Warranty: "2 years",
    },
    images: [img("zigbee-switch-1.jpg"), img("zigbee-switch-2.jpg")],
  },
  {
    name: "Smart Smoke Detector",
    slug: "smart-smoke-detector",
    sku: "TDS-SD-010",
    tagline:
      "Everything a normal smoke alarm does, plus a notification on your phone.",
    description:
      "A smart smoke detector that does everything a traditional smoke alarm does, then adds connectivity and intelligent features. It detects smoke from fire and sounds a loud alarm, while sending notifications to your phone even when you're away from home.\n\nCheck the detector's status remotely through the app. Automatic self-testing verifies the sensor, speaker and battery so you know the device is working, and low-battery notifications arrive in the app instead of relying only on a chirp at 3am.\n\nInterconnect multiple detectors so that when one senses danger, every connected alarm in the home sounds. Smart home integration can trigger actions during a fire — turning on lights, unlocking smart locks or shutting down air conditioning. Event history keeps a reviewable log of all alarm activity.",
    price: 899,
    compareAtPrice: 1099,
    costPrice: 460,
    stock: 74,
    categorySlug: "smoke-gas-detectors",
    brand: "Tuya",
    isNewArrival: true,
    ratingAvg: 4.5,
    ratingCount: 151,
    features: [
      "Detects smoke from fire and sounds a loud alarm",
      "Smartphone alerts even when you're away from home",
      "Remote status monitoring through the app",
      "Automatic self-testing of sensor, speaker and battery",
      "Low battery notifications in the app",
      "Interconnected alarms — one detects, all sound",
      "Smart home triggers for lights, locks and HVAC",
      "Event history log of all alarm activity",
    ],
    specs: {
      Sensor: "Photoelectric smoke sensor",
      Alarm: "85dB at 3m",
      Connectivity: "Wi-Fi 2.4GHz",
      Interconnect: "Up to 20 detectors",
      Battery: "CR123A, up to 3 years",
      Certification: "SANS 1785 compliant",
      "Self-test": "Automatic",
      Warranty: "2 years",
    },
    images: [img("smoke-detector-1.jpg"), img("smoke-detector-2.jpg")],
  },
  {
    name: "Smart Curtain Kit",
    slug: "smart-curtain-kit",
    sku: "TDS-CK-011",
    tagline:
      "Curtains that open with the sunrise and close when movie mode starts.",
    description:
      "A motorised kit that automates opening and closing your curtains. The package includes the motor, controller and mobile app, with support for voice assistants and smart home integration.\n\nCurtains open and close automatically on a schedule or preset routine — open in the morning, close in the evening — and you can control them from anywhere with the app. Voice control works with Amazon Alexa, Google Assistant and Apple HomeKit, so \"open the living room curtains\" is all it takes.\n\nControlling sunlight helps reduce heating and cooling costs, and closed curtains improve insulation. Connect the kit to other smart devices to build scenes: curtains close automatically when Movie Mode activates, or open when your smart alarm goes off. Manual override lets you pull the curtain by hand and the motor takes over without damage.\n\nWhile you're away, scheduled opening and closing simulates occupancy so the home appears lived in. Commonly installed in homes and apartments, offices and conference rooms, hotel guest rooms, healthcare facilities and smart buildings.",
    price: 3299,
    compareAtPrice: 3899,
    costPrice: 1980,
    stock: 29,
    categorySlug: "smart-curtain-kits",
    brand: "Aqara",
    isFeatured: true,
    isNewArrival: true,
    ratingAvg: 4.4,
    ratingCount: 88,
    features: [
      "Automatic curtain opening and closing on a schedule",
      "Remote control from anywhere via the mobile app",
      "Voice control with Alexa, Google Assistant and Apple HomeKit",
      "Energy efficiency — manage sunlight and improve insulation",
      "Smart home scenes, e.g. close on Movie Mode, open with your alarm",
      "Manual override — pull by hand and the motor takes over",
      "Occupancy simulation while you're away",
      "Quiet motor suitable for bedrooms",
    ],
    specs: {
      "Kit contents": "Motor, controller, track adaptor, remote, power supply",
      Connectivity: "Wi-Fi 2.4GHz + Zigbee options",
      "Voice assistants": "Alexa, Google Assistant, Apple HomeKit",
      "Max curtain weight": "40kg",
      "Track length": "Up to 6m (configurable)",
      "Noise level": "< 30dB",
      "Manual override": "Yes — pull to start",
      Applications: "Homes, offices, hotels, healthcare, smart buildings",
      Warranty: "2 years",
    },
    images: [
      img("curtain-kit-1.jpg"),
      img("curtain-kit-2.jpg"),
      img("curtain-kit-3.jpg"),
    ],
  },
];

async function seedCategories() {
  const slugToId = new Map<string, string>();

  for (const [index, parent] of CATEGORIES.entries()) {
    const created = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: {
        name: parent.name,
        description: parent.description,
        icon: parent.icon,
        position: index,
        featured: true,
        // `image` is deliberately absent, like `featured` below: once an admin
        // uploads a real tile, re-seeding must not put the placeholder path back.
      },
      create: {
        name: parent.name,
        slug: parent.slug,
        description: parent.description,
        icon: parent.icon,
        image: parent.image,
        position: index,
        featured: true,
      },
    });
    slugToId.set(parent.slug, created.id);

    for (const [childIndex, child] of parent.children.entries()) {
      const createdChild = await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          name: child.name,
          description: child.description,
          icon: child.icon,
          position: childIndex,
          parentId: created.id,
          // `featured` and `image` are deliberately absent: both are admin-owned
          // (the "Show on homepage" toggle and the uploaded tile), so re-seeding
          // must not undo their choices.
        },
        create: {
          name: child.name,
          slug: child.slug,
          description: child.description,
          icon: child.icon,
          image: child.image,
          position: childIndex,
          parentId: created.id,
          // A fresh database should render a populated homepage rail.
          featured: true,
        },
      });
      slugToId.set(child.slug, createdChild.id);
    }
  }

  console.log(`  categories: ${slugToId.size}`);
  return slugToId;
}

async function seedBrands() {
  const slugToId = new Map<string, string>();

  for (const name of BRANDS) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    slugToId.set(name, brand.id);
  }

  console.log(`  brands: ${slugToId.size}`);
  return slugToId;
}

async function seedProducts(
  categoryIds: Map<string, string>,
  brandIds: Map<string, string>,
) {
  for (const product of PRODUCTS) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(
        `Unknown category slug "${product.categorySlug}" on ${product.sku}`,
      );
    }

    const data = {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      tagline: product.tagline,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      costPrice: product.costPrice,
      stock: product.stock,
      isActive: true,
      isFeatured: product.isFeatured ?? false,
      isBestseller: product.isBestseller ?? false,
      isNewArrival: product.isNewArrival ?? false,
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      features: product.features,
      specs: product.specs,
      metaTitle: `${product.name} | Tados Web`,
      metaDescription: product.tagline,
      categoryId,
      brandId: brandIds.get(product.brand) ?? null,
    };

    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: data,
    });

    // Only seed the gallery when there isn't one. Deleting and recreating would
    // avoid duplicates on re-run, but it would also throw away photos uploaded
    // from the admin (or migrated to the bucket) and restore the placeholder
    // paths — which is a re-seed silently breaking every product image.
    const existingImages = await prisma.productImage.count({
      where: { productId: saved.id },
    });

    if (existingImages === 0) {
      await prisma.productImage.createMany({
        data: product.images.map((url, position) => ({
          productId: saved.id,
          url,
          alt: `${product.name} — view ${position + 1}`,
          position,
        })),
      });
    }
  }

  console.log(`  products: ${PRODUCTS.length}`);
}

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@tadosweb.co.za")
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN },
    create: {
      email,
      name: "Store Administrator",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`  admin: ${email}`);
}

async function main() {
  console.log("Seeding Tados Web…");

  const categoryIds = await seedCategories();
  const brandIds = await seedBrands();
  await seedProducts(categoryIds, brandIds);
  await seedAdmin();

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
