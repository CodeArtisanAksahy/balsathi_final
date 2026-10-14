"use client";

import { useState } from "react";
import {
  Heart, Apple, Moon, Activity, Droplets, Sun, BookOpen,
  ChevronDown, ChevronUp, Info, ShieldAlert,
} from "lucide-react";
import type { SessionUser } from "@/lib/domain";
import { cn } from "@/lib/utils";

const healthTopics = [
  {
    id: "nutrition",
    icon: Apple,
    title: "Nutrition & Feeding",
    color: "bg-forest/10 text-forest",
    items: [
      { title: "Balanced meals for toddlers", desc: "Include grains, proteins, fruits, vegetables, and dairy in every meal. Offer small, frequent meals and snacks." },
      { title: "Iron-rich foods", desc: "Spinach, lentils, jaggery, and fortified cereals help prevent anemia. Pair with vitamin C (citrus, tomatoes) for better absorption." },
      { title: "Hydration", desc: "Offer water throughout the day. Limit sugary drinks. Breast milk or formula remains important under 2 years." },
      { title: "Avoid choking hazards", desc: "Cut food into small pieces. Avoid whole grapes, nuts, hard candies, and raw carrots until the child can chew well." },
    ],
  },
  {
    id: "sleep",
    icon: Moon,
    title: "Sleep & Rest",
    color: "bg-purple-100 text-purple-600",
    items: [
      { title: "Sleep duration by age", desc: "1-2 years: 11-14 hours. 3-5 years: 10-13 hours. Includes naps. Consistent bedtime routines help." },
      { title: "Bedtime routine", desc: "A warm bath, story, and lullaby signal sleep time. Keep the room dark, quiet, and cool." },
      { title: "Screen time before bed", desc: "Avoid screens 1 hour before bedtime. Blue light can disrupt sleep patterns." },
    ],
  },
  {
    id: "activity",
    icon: Activity,
    title: "Physical Activity",
    color: "bg-amber-light text-amber-700",
    items: [
      { title: "Daily movement", desc: "Toddlers need at least 3 hours of active play per day. Running, climbing, dancing, and outdoor play all count." },
      { title: "Gross motor skills", desc: "Activities like kicking a ball, jumping, and balancing help develop large muscle groups." },
      { title: "Fine motor skills", desc: "Stacking blocks, drawing, using spoons, and turning pages develop hand-eye coordination." },
    ],
  },
  {
    id: "hygiene",
    icon: Droplets,
    title: "Hygiene & Safety",
    color: "bg-blue-100 text-blue-600",
    items: [
      { title: "Handwashing", desc: "Wash hands before meals, after using the toilet, and after playing outside. Use soap and water for 20 seconds." },
      { title: "Oral care", desc: "Brush teeth twice a day with a soft brush and a small amount of fluoride toothpaste. Visit a dentist by age 1." },
      { title: "Home safety", desc: "Use safety gates, outlet covers, and corner guards. Keep medicines and cleaning products out of reach." },
    ],
  },
  {
    id: "sun",
    icon: Sun,
    title: "Sun & Outdoor Play",
    color: "bg-orange-100 text-orange-600",
    items: [
      { title: "Vitamin D", desc: "15-20 minutes of morning sunlight helps the body make vitamin D for strong bones." },
      { title: "Sun protection", desc: "Use hats, light clothing, and child-safe sunscreen during peak sun hours (10am-4pm)." },
    ],
  },
  {
    id: "learning",
    icon: BookOpen,
    title: "Learning & Stimulation",
    color: "bg-pink-100 text-pink-600",
    items: [
      { title: "Reading together", desc: "Read aloud daily. Point to pictures, ask questions, and let the child turn pages. Builds language and bonding." },
      { title: "Talking and listening", desc: "Narrate daily activities, respond to babble, and ask open-ended questions. Language grows through conversation." },
      { title: "Play-based learning", desc: "Free play, pretend play, and exploration are how young children learn best. Avoid passive screen time under 18 months." },
    ],
  },
];

export default function ParentHealthPage() {
  const [expanded, setExpanded] = useState<string | null>("nutrition");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <Heart className="w-4 h-4 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800">Health &amp; Well-being</h1>
        </div>
        <p className="text-stone-500 text-sm">
          General educational guidance for parents. Not individualized medical advice. Consult a pediatrician for specific concerns.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Important</p>
          <p className="mt-0.5">
            This content is for general educational purposes only. It does not replace professional medical advice, diagnosis, or treatment.
            Always seek the advice of a qualified health provider with any questions about your child&apos;s health.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {healthTopics.map((topic) => {
          const Icon = topic.icon;
          const isOpen = expanded === topic.id;
          return (
            <div key={topic.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : topic.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", topic.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-stone-800">{topic.title}</h3>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-stone-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-stone-400" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-stone-100">
                  {topic.items.map((item, i) => (
                    <div key={i} className="p-3 rounded-xl bg-stone-50">
                      <h4 className="font-medium text-stone-800 text-sm">{item.title}</h4>
                      <p className="text-sm text-stone-600 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
