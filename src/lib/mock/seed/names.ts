import type { BloodGroup, Gender } from "@/types";

export const firstNamesMale = [
  "Aarav","Arjun","Ayaan","Kabir","Rohan","Ishaan","Vihaan","Aditya","Rudra","Karthik",
  "Rahul","Siddharth","Ananya","Rahul","Devansh","Manav","Yash","Om","Farhan","Zaid",
  "Imran","Bilal","Hassan","Usman","Nabeel","Fahad","Tariq","Shahzeb","Hamza","Aakash",
  "Nikhil","Varun","Kunal","Samar","Rehan","Tarun","Nikhil","Harsh","Gaurav","Deepak",
];

export const firstNamesFemale = [
  "Aanya","Diya","Isha","Kavya","Meera","Nisha","Priya","Riya","Saanvi","Tara",
  "Anika","Bhavya","Chitra","Divya","Esha","Farah","Gauri","Hina","Ishita","Juhi",
  "Kritika","Lavanya","Mahima","Neha","Pooja","Qureshi","Rashmi","Sneha","Trisha","Vaishnavi",
  "Winnie","Yashika","Zara","Ayesha","Sana","Mariam","Lubna","Insha","Noor","Sadia",
];

export const lastNames = [
  "Sharma","Verma","Patel","Reddy","Nair","Iyer","Gupta","Singh","Kumar","Mehta",
  "Joshi","Desai","Rao","Chopra","Malhotra","Kapoor","Bose","Banerjee","Chatterjee","Das",
  "Pillai","Menon","Shetty","Kulkarni","Bhat","Agarwal","Sethi","Khanna","Bajaj","Chawla",
  "Farooq","Khan","Qureshi","Siddiqui","Hussain","Ansari","Rizvi","Ansari","Hashmi","Sheikh",
];

export const bloodGroups: BloodGroup[] = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
export const genders: Gender[] = ["male", "female"];

export const cities = [
  { city: "Bengaluru", state: "Karnataka", postalCode: "560001" },
  { city: "Hyderabad", state: "Telangana", postalCode: "500001" },
  { city: "Chennai", state: "Tamil Nadu", postalCode: "600001" },
  { city: "Pune", state: "Maharashtra", postalCode: "411001" },
  { city: "Mumbai", state: "Maharashtra", postalCode: "400001" },
  { city: "Delhi", state: "Delhi", postalCode: "110001" },
  { city: "Kochi", state: "Kerala", postalCode: "682001" },
  { city: "Jaipur", state: "Rajasthan", postalCode: "302001" },
];

export const streets = [
  "MG Road","Park Avenue","Lake View Road","Gandhi Nagar","Rose Garden Street","Hill Side Lane",
  "Green Park Colony","Nehru Street","Orchid Avenue","Palm Grove Road",
];

export const occupations = [
  "Engineer","Doctor","Business Owner","Bank Manager","Architect","Teacher","Consultant",
  "Pharmacist","Accountant","Designer","Civil Servant","Lawyer","Homemaker","Retired Government Employee",
];

export const designations = [
  "Principal","Vice Principal","Head of Department","Senior Teacher","Teacher","Coordinator",
];

export const departments = ["Mathematics","Science","English","Humanities","Computer Science","Physical Education","Social Studies","Commerce"];

export const staffDepartments = ["accounts","admissions","library","transport","maintenance","security","administration","it","medical"];

export const firstNames = [...firstNamesMale, ...firstNamesFemale];

export const pickNamePair = (
  rng: { pick: <T,>(i: readonly T[]) => T; bool: (p?: number) => boolean },
): { firstName: string; lastName: string; gender: Gender } => {
  const gender: Gender = rng.bool(0.5) ? "male" : "female";
  return {
    gender,
    firstName: rng.pick(gender === "male" ? firstNamesMale : firstNamesFemale),
    lastName: rng.pick(lastNames),
  };
};