export function genericPracticeContent(practiceName: string, practiceType = "Healthcare practice") {
  const type = practiceType.replaceAll("_", " ").toLowerCase();
  return {
    hero: {
      eyebrow: "Independent healthcare practice",
      headline: `Welcome to ${practiceName}.`,
      description: `Book trusted ${type} services with ${practiceName}.`,
      bookingLabel: "Book an appointment",
      servicesLabel: "Explore services",
      trustPoints: ["No patient account needed", "Your information stays with this practice"],
    },
    about: {
      eyebrow: "About the practice",
      heading: `Care from ${practiceName}.`,
      lead: `${practiceName} provides independently managed healthcare services through Mondesa Health.`,
      body: "The practice controls its own clinical team, services, opening hours, patient records and public information.",
      values: [
        { title: "Independent care", text: "Managed directly by the practice team." },
        { title: "Private by design", text: "Records are isolated from other practices." },
      ],
    },
    appointment: {
      eyebrow: "Your appointment",
      heading: "Simple to arrange. Easy to prepare for.",
      ctaLabel: "View appointment times",
      steps: [
        { number: "01", title: "Choose a service", text: "Select one of the services published by this practice." },
        { number: "02", title: "Choose your time", text: "Pick an available appointment or submit a preferred-time request." },
        { number: "03", title: "Keep your secure link", text: "Use your private link to review or manage the appointment." },
      ],
    },
    contact: { eyebrow: "Contact & location", heading: "Contact the practice.", phoneLabel: "Call", directionsLabel: "Get directions" },
    closing: { eyebrow: "Care that fits your life", heading: "Start with the care you need.", description: `Book directly with ${practiceName}.`, bookingLabel: "Book an appointment" },
  };
}
