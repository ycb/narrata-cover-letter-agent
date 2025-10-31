// Script to extract Appify JSON from RTF file
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rtfPath = '/Users/admin/Downloads/ps-li-apify.rtf';
const outputPath = path.join(__dirname, '../fixtures/synthetic/v1/appify_template.json');

try {
  const rtfContent = fs.readFileSync(rtfPath, 'utf-8');
  
  // The RTF file contains escaped JSON. We'll manually extract the structure
  // by reading the RTF file and reconstructing the JSON based on patterns
  
  // For now, let's create a minimal JSON structure based on what we can see
  // The actual extraction will need manual review of the RTF
  
  const appifyTemplate = {
    basic_info: {
      fullname: "Peter Spannagle",
      first_name: "Peter",
      last_name: "Spannagle",
      headline: "AI Product Manager | Growth + Scale | Design + Code |  ex-Samsung, Salesforce, Meta",
      public_identifier: "pspan",
      profile_url: "https://linkedin.com/in/pspan",
      profile_picture_url: "https://media.licdn.com/dms/image/v2/D5603AQGlmxq3qC8XAw/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1721362658684?e=1762387200&v=beta&t=y6rfItY9WlDr1yKpg1pVYQK4H69OEoQikhC7ZMscENc",
      about: "Product leader with 12 years experience leading cross-functional teams through 0-1, hypergrowth and impact at scale.  5 years progressive leadership in clean tech.  Founder of 2 companies.\n\nAs Vice President of Product at Enact Systems, I led a team of 8 to create hardware-agnostic solar monitoring and home energy management, resulting in +210% MAUs, +876% events and +169% growth in revenue.\n\nAs Senior Product Manager at Aurora Solar I led a platform rebuild that took the company from Series A to C, capturing the majority of the US market for solar software and achieving a $4 billion valuation.  I implemented beta testing and led the company-wide usage of behavioral analytics. I created processes to accelerate delivery and enhance collaboration, including unified product roadmap, phased release plan and in-app guides for product-led onboarding.\n\nAs Product Lead at Meta, I led an AI/ML team building internal tools to increase efficiency in recruiting.  By implementing user-centric research and iterative development, I identified pain points and perceptions that limited feature adoption, leading to a 130% increase in ML feature usage within 30 days and a 10X increase by year's end.\n\nAs Senior Manager at Samsung, I led a team of 12 to enhance customer care for 20 million users.  I developed personalized support content and introduced video chat and SMS support.  I designed a chatbot to provide instant answers to common questions using Natural Language Processing and Machine Learning.  These efforts led to a 160% increase in monthly active users and raised customer satisfaction ratings from 3.7 to 4.3.",
      location: {
        country: "United States",
        city: "San Francisco Bay Area",
        full: "San Francisco Bay Area",
        country_code: "US"
      },
      creator_hashtags: [],
      is_creator: false,
      is_influencer: false,
      is_premium: false,
      created_timestamp: 1202462660000,
      show_follower_count: false,
      background_picture_url: "https://media.licdn.com/dms/image/v2/D5616AQH7BT2q39Chsg/profile-displaybackgroundimage-shrink_350_1400/profile-displaybackgroundimage-shrink_350_1400/0/1720227766811?e=1762387200&v=beta&t=1b8tRZ0A2hK75KU7ual6rakVjAwwzEGexNPBJFu3x5E",
      urn: "ACoAAAFDFc8BdrshBLIBS9k_sCZJeITQortF5Tc",
      follower_count: 4382,
      connection_count: 4321,
      current_company: "SpatialThink",
      current_company_urn: "81942022",
      current_company_url: "https://www.linkedin.com/company/spatialthink",
      email: null
    },
    experience: [
      {
        title: "Co-Founder",
        company: "SpatialThink",
        description: "No-code interactive 3D simulations to enhance skilled trades training\n\n• Built v1 product: create and share interactive 3D simulations via web, mobile and AR\n• Earned $250k+ in revenue and onboarded first 100 users",
        duration: "Sep 2021 - Present · 4 yrs 2 mos",
        start_date: {
          year: 2021,
          month: "Sep"
        },
        is_current: true,
        company_linkedin_url: "https://www.linkedin.com/company/81942022/",
        company_logo_url: "https://media.licdn.com/dms/image/v2/C560BAQHLazok3jpd7w/company-logo_400_400/company-logo_400_400/0/1655061508891?e=1762387200&v=beta&t=HL2GxDqilhWRT0rRTAGCqslkdtTWrv8nqY9T-zWHRaM",
        skills: ["Start-up Leadership", "Business Strategy"],
        company_id: "81942022"
      },
      {
        title: "VP of Product",
        company: "Enact Solar",
        location: "San Francisco, California, United States",
        description: "Management team for Series A startup, led a cross-functional team of 8 to improve solar ownership\n\n• Activation: +210% Monthly Active Users | 50% activation rate\n• Retention: +620% visitors | +876% events | +853% time spent in app\n• Revenue +169% | 7% referral rate | +567% referrals",
        duration: "Mar 2022 - Feb 2024 · 2 yrs",
        start_date: {
          year: 2022,
          month: "Mar"
        },
        end_date: {
          year: 2024,
          month: "Feb"
        },
        is_current: false,
        company_linkedin_url: "https://www.linkedin.com/company/3556591/",
        company_logo_url: "https://media.licdn.com/dms/image/v2/D560BAQGj4npkDuaRZA/company-logo_400_400/company-logo_400_400/0/1716268622065/enact_systems_inc_logo?e=1762387200&v=beta&t=kyF2gObWhIUeJQp8hadrA653MVO8uVxfQpTBmtdhXzk",
        employment_type: "Full-time",
        skills: ["Cleantech", "Start-up Leadership"],
        company_id: "3556591"
      },
      {
        title: "Senior Product Manager",
        company: "Aurora Solar",
        location: "San Francisco Bay Area",
        description: "First product hire for industry-leading solar SaaS | Series A to C | 2X YoY revenue | 10X team\n\n• Core PM: improved onboarding via targeted guides and phased roll-out, built first design system\n• QoQ on-time feature delivery: coordinated platform rebuild across teams with unified roadmap\n• Introduced design sprints, prototype testing, automated bug reporting and behavioral analytics",
        duration: "Jun 2019 - Sep 2021 · 2 yrs 4 mos",
        start_date: {
          year: 2019,
          month: "Jun"
        },
        end_date: {
          year: 2021,
          month: "Sep"
        },
        is_current: false,
        company_linkedin_url: "https://www.linkedin.com/company/3610169/",
        company_logo_url: "https://media.licdn.com/dms/image/v2/C560BAQHSsIVLHG2Hnw/company-logo_400_400/company-logo_400_400/0/1656281654627/aurora_solar_logo?e=1762387200&v=beta&t=nltFhB_T_ri_HsviDshcLGO7h-arMlQFCAgm6UlBIbk",
        skills: ["Cleantech", "Product Management"],
        company_id: "3610169"
      },
      {
        title: "Head of Design",
        company: "FalconX",
        location: "Menlo Park, California",
        description: "Consulting role to deliver v1 product design for seed-stage blockchain-based financial services platform, now an $8b unicorn\n\n• Exchange + wallet design using agile methods for discovery, concepts and validation\n• Managed a design agency for branding and marketing",
        duration: "Sep 2018 - May 2019 · 9 mos",
        start_date: {
          year: 2018,
          month: "Sep"
        },
        end_date: {
          year: 2019,
          month: "May"
        },
        is_current: false,
        company_linkedin_url: "https://www.linkedin.com/company/18758988/",
        company_logo_url: "https://media.licdn.com/dms/image/v2/D560BAQHOmawWn0HWsQ/company-logo_400_400/company-logo_400_400/0/1709754717259/thefalconx_logo?e=1762387200&v=beta&t=Y5Zjjx0gMRo_13u6k5g6E31he-dfXQmfsSQmY75OLyY",
        skills: ["User Experience", "Product Management"],
        company_id: "18758988"
      },
      {
        title: "Product Team Lead (AI/ML)",
        company: "Facebook",
        location: "Menlo Park, California",
        description: "Consulting role:  led an AI/ML team building internal tools to increase recruiting efficiency\n\n• Identified barriers to adoption via user interviews mapping workflow, pain points and perceptions\n• Revised roadmap achieved 10X increase in usage of machine learning features, exceeding annual goal by 9%\n• Revised product strategy increased usage of machine learning features by 130% within 30 days",
        duration: "Jun 2018 - Dec 2018 · 7 mos",
        start_date: {
          year: 2018,
          month: "Jun"
        },
        end_date: {
          year: 2018,
          month: "Dec"
        },
        is_current: false,
        company_linkedin_url: "https://www.linkedin.com/company/76987811/",
        company_logo_url: "https://media.licdn.com/dms/image/v2/C4E0BAQHi-wrXiQcbxw/company-logo_400_400/company-logo_400_400/0/1635988509331/facebook__logo?e=1762387200&v=beta&t=AoiNgs26_MRBUnphA-rF5_Y5GPviTjfx5TYjp6aY1yM",
        skills: ["Machine Learning", "Product Management"],
        company_id: "76987811"
      }
    ],
    education: [
      {
        school: "University of California, Berkeley",
        degree: "B.A., Cultural Geography",
        degree_name: "B.A.",
        field_of_study: "Cultural Geography",
        duration: "1999 - 2000",
        start_date: {
          year: 1999
        },
        end_date: {
          year: 2000
        },
        school_linkedin_url: "https://www.linkedin.com/company/2517/",
        school_logo_url: "https://media.licdn.com/dms/image/v2/D560BAQGwjF_5CYj_JQ/company-logo_400_400/company-logo_400_400/0/1732135669731/uc_berkeley_logo?e=1762387200&v=beta&t=JXwYyQxe1mT3_I0t9iJpsAXdhiATu7y3TtIUNZDJ1E0",
        school_id: "2517"
      }
    ],
    projects: [
      {
        name: "Building Efficiency for a Sustainable Tomorrow (BEST)",
        description: "The Building Efficiency for a Sustainable Tomorrow (BEST) Center promotes state-of-the-art building technician education at publicly-funded 2- and 4-year colleges through the dissemination of curriculum, research and best practices for managing energy efficient commercial buildings. Sponsored by Advanced Technological Education grants from the National Science Foundation.\n\nThe main goal of the site is to be a user-friendly robust repository of information and resources related to building technician training, and to share this curriculum with instructors and administrators throughout the US.\n\nMy role included: project lead, UX, IxD, project management, front end development and QA.",
        associated_with: "Your Custom Blog",
        is_current: false
      },
      {
        name: "Digital Air Strike Redesign",
        description: "Digital Air Strike is the automotive industry's largest and most experienced provider of social media, reputation management and lead response solutions, serving thousands of dealers nationwide.  Digital Air Strike has received recognition from Microsoft and been endorsed by GM, Kia and Ford.\n\nAs the project lead, I worked closely with the management team in Sunnyvale to develop requirements.  Throughout the process I collaborated with remote team members, including the CMO/COO, Technical Lead and Designer.  I provided UX, IxD and UI consulting services, including feedback and direction in the creative phase to produce final creative deliverables.  I also did front end development, QA and testing.\n\nAs an Academy of Art Master's student intern, Dario Novoa did front end and back end programming, responsive design, framework selection and custom theme development.",
        associated_with: "Your Custom Blog",
        is_current: false
      }
    ],
    certifications: [
      {
        name: "Leading for Creativity",
        issuer: "IDEO U",
        issued_date: "Issued Sep 2017"
      }
    ],
    languages: [
      {
        language: "English",
        proficiency: "Native or bilingual proficiency"
      },
      {
        language: "Spanish",
        proficiency: "Native or bilingual proficiency"
      }
    ],
    skills: []
  };

  // Write the template
  fs.writeFileSync(outputPath, JSON.stringify(appifyTemplate, null, 2));
  console.log(`✅ Appify template saved to: ${outputPath}`);
  console.log('📝 Note: This is a manual extraction from the RTF file.');
  console.log('   Review and adjust as needed based on the actual RTF content.');
  
} catch (error) {
  console.error('Error extracting Appify JSON:', error);
  process.exit(1);
}

