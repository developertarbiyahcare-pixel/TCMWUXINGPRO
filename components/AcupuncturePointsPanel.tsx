import React from 'react';
import { MapPin, Info, Zap } from 'lucide-react';

interface Point {
  name: string;
  location: string;
  indication: string;
  element: string;
}

const acupuncturePoints: Point[] = [
  { name: 'LU7 (Lieque)', location: 'Radial side of the forearm, 1.5 cun above the wrist crease.', indication: 'Cough, asthma, sore throat, facial paralysis.', element: 'Metal' },
  { name: 'LI4 (Hegu)', location: 'On the dorsum of the hand, between the 1st and 2nd metacarpal bones.', indication: 'Headache, toothache, fever, constipation.', element: 'Metal' },
  { name: 'ST36 (Zusanli)', location: '3 cun below the knee, one finger-width lateral to the tibia.', indication: 'Stomach pain, bloating, fatigue, immune boost.', element: 'Earth' },
  { name: 'SP6 (Sanyinjiao)', location: '3 cun above the medial malleolus, behind the tibia.', indication: 'Insomnia, menstrual pain, digestive issues.', element: 'Earth' },
  { name: 'HT7 (Shenmen)', location: 'At the ulnar end of the wrist crease.', indication: 'Anxiety, insomnia, heart palpitations.', element: 'Fire' },
  { name: 'SI3 (Houxi)', location: 'On the ulnar side of the hand, proximal to the 5th metacarpophalangeal joint.', indication: 'Neck pain, back pain, epilepsy.', element: 'Fire' },
  { name: 'BL40 (Weizhong)', location: 'At the midpoint of the transverse crease of the popliteal fossa.', indication: 'Back pain, hip pain, skin diseases.', element: 'Water' },
  { name: 'KI3 (Taixi)', location: 'In the depression between the medial malleolus and the Achilles tendon.', indication: 'Dizziness, tinnitus, sore throat, asthma.', element: 'Water' },
  { name: 'PC6 (Neiguan)', location: '2 cun above the wrist crease, between the tendons of palmaris longus and flexor carpi radialis.', indication: 'Nausea, vomiting, chest pain, insomnia.', element: 'Fire' },
  { name: 'TE5 (Waiguan)', location: '2 cun above the wrist crease, between the radius and ulna.', indication: 'Fever, headache, earache, wrist pain.', element: 'Fire' },
  { name: 'GB34 (Yanglingquan)', location: 'In the depression anterior and inferior to the head of the fibula.', indication: 'Gallbladder issues, muscle pain, sciatica.', element: 'Wood' },
  { name: 'LR3 (Taichong)', location: 'On the dorsum of the foot, in the depression distal to the junction of the 1st and 2nd metatarsal bones.', indication: 'Stress, anger, headache, eye issues.', element: 'Wood' },
];

const AcupuncturePointsPanel: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-3xl border border-purple-100 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Acupuncture Reference</h2>
              <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Master Points & Indications</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {acupuncturePoints.map((point, idx) => (
              <div key={idx} className="group bg-purple-50 hover:bg-white border border-purple-100 hover:border-teal-200 p-4 rounded-2xl transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-black text-teal-600 uppercase tracking-tight">{point.name}</span>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${
                    point.element === 'Wood' ? 'bg-emerald-100 text-emerald-600' :
                    point.element === 'Fire' ? 'bg-rose-100 text-rose-600' :
                    point.element === 'Earth' ? 'bg-amber-100 text-amber-600' :
                    point.element === 'Metal' ? 'bg-slate-100 text-slate-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {point.element}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <MapPin className="w-4 h-4 text-purple-300 shrink-0" />
                    <p className="text-xs text-purple-700 leading-relaxed">{point.location}</p>
                  </div>
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-teal-400 shrink-0" />
                    <p className="text-xs font-bold text-purple-900">{point.indication}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl">
        <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" /> Clinical Note
        </h3>
        <p className="text-xs text-amber-800 leading-relaxed font-medium">
          The points listed above are fundamental master points used in TCM clinical practice. For specific syndrome-based treatment, always refer to the CDSS Auto-Rx panel or consult with a senior practitioner. Proper needle technique and sterilization are mandatory.
        </p>
      </div>
    </div>
  );
};

export default AcupuncturePointsPanel;
