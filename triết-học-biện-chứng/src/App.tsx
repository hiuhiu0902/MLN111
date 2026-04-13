import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import {
  BookOpen,
  MessageSquare,
  Send,
  X,
  ChevronRight,
  Layers,
  RefreshCw,
  Zap,
  ArrowRight,
  Info,
  LogOut,
  User,
  Settings,
  History,
  LogIn,
  Camera,
  Sun,
  Moon
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getChatResponse, generateImage } from "./lib/gemini";
import { auth, db, googleProvider } from "./lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, fetchSignInMethodsForEmail, sendPasswordResetEmail } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  limit
} from "firebase/firestore";

interface Message {
  role: "user" | "model";
  text: string;
  timestamp?: any;
}

interface UserProfile {
  displayName: string;
  photoURL?: string;
}

interface Law {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: React.ReactNode;
  content: string;
  example: string;
  imagePrompt: string;
  imageUrl?: string;
}

interface Principle {
  id: string;
  title: string;
  description: string;
  detailedDefinition: string;
  properties: string[];
  detailedProperties: string;
  meaning: string;
  icon: React.ReactNode;
}

interface Category {
  id: string;
  title: string;
  definition: string;
  detailedDefinition: string;
  relationship: string;
  meaning: string;
  example: string;
  icon: React.ReactNode;
}

const PRINCIPLES: Principle[] = [
  {
    id: "p1",
    title: "Nguyên lý về mối liên hệ phổ biến",
    description: "Chỉ sự tác động, quy định, chuyển hóa lẫn nhau giữa các sự vật, hiện tượng hoặc giữa các mặt bên trong của chúng.",
    detailedDefinition: "Mối liên hệ là phạm trù triết học dùng để chỉ sự tác động, quy định, chuyển hóa lẫn nhau giữa các sự vật, hiện tượng hay giữa các mặt, các yếu tố bên trong của một sự vật.",
    properties: ["Tính khách quan", "Tính phổ biến", "Tính đa dạng, phong phú"],
    detailedProperties: "Có ba tính chất cơ bản là tính khách quan (vốn có của mọi sự vật), tính phổ biến (thể hiện trong mọi lĩnh vực tự nhiên, xã hội, tư duy) và tính đa dạng, phong phú (có nhiều loại liên hệ khác nhau như bên trong/bên ngoài, trực tiếp/gián tiếp, cơ bản/không cơ bản...).",
    meaning: "Yêu cầu phải có quan điểm toàn diện (xem xét tất cả các mối liên hệ và phân loại chúng để tìm ra bản chất) và quan điểm lịch sử - cụ thể (đặt sự vật trong không gian, thời gian cụ thể) trong nhận thức và thực tiễn.",
    icon: <Layers className="w-8 h-8 text-primary" />
  },
  {
    id: "p2",
    title: "Nguyên lý về sự phát triển",
    description: "Quá trình vận động tiến lên: từ thấp đến cao, từ đơn giản đến phức tạp, từ kém hoàn thiện đến hoàn thiện hơn.",
    detailedDefinition: "Phát triển là quá trình vận động tiến lên của sự vật: từ thấp lên cao, từ đơn giản đến phức tạp, từ kém hoàn thiện đến hoàn thiện hơn. Phát triển là quá trình biến đổi về chất theo hướng ngày càng hoàn thiện, khác với sự tăng trưởng đơn thuần.",
    properties: ["Tính khách quan", "Tính phổ biến", "Tính đa dạng, phong phú"],
    detailedProperties: "Mang tính khách quan (do quy luật khách quan chi phối), tính phổ biến (diễn ra ở mọi lĩnh vực) và tính phong phú, đa dạng (không hoàn toàn giống nhau ở những không gian, thời gian khác nhau).",
    meaning: "Đòi hỏi quan điểm phát triển, tức là phải luôn đặt sự vật trong khuynh hướng vận động, biến đổi để phát hiện xu hướng; biết phát hiện và ủng hộ cái mới, chống bảo thủ, trì trệ; đồng thời biết kế thừa yếu tố tích cực từ cái cũ.",
    icon: <RefreshCw className="w-8 h-8 text-primary" />
  }
];

const CATEGORIES: Category[] = [
  {
    id: "c1",
    title: "Cái riêng & Cái chung",
    definition: "Cái riêng chỉ sự vật nhất định; Cái chung chỉ thuộc tính phổ biến trong nhiều sự vật.",
    detailedDefinition: "Cái riêng là phạm trù dùng để chỉ một sự vật, một hiện tượng, một quá trình nhất định. Cái chung là phạm trù dùng để chỉ những mặt, những thuộc tính không những có ở một sự vật, một hiện tượng nhất định, mà còn lặp lại trong nhiều sự vật, hiện tượng khác nữa. Ngoài ra còn có 'Cái đơn nhất' chỉ những đặc điểm chỉ có ở một sự vật.",
    relationship: "Cái chung chỉ tồn tại trong cái riêng, thông qua cái riêng mà biểu hiện sự tồn tại của mình. Cái riêng chỉ tồn tại trong mối liên hệ đưa tới cái chung. Cái riêng là cái toàn bộ, phong phú hơn cái chung; cái chung là cái bộ phận nhưng sâu sắc hơn cái riêng. Cái chung và cái đơn nhất có thể chuyển hóa cho nhau trong những điều kiện nhất định.",
    meaning: "Để nhận thức được cái chung phải xuất phát từ cái riêng. Nhiệm vụ của nhận thức là phải tìm ra cái chung và trong hoạt động thực tiễn phải dựa vào cái chung để cải tạo cái riêng. Trong hoạt động thực tiễn cần chủ động tạo điều kiện cho cái đơn nhất có lợi cho con người trở thành cái chung và ngược lại.",
    example: "Mỗi con người cụ thể là một 'Cái riêng'. Những thuộc tính sinh học (có tư duy, biết lao động) là 'Cái chung' của loài người. Dấu vân tay của mỗi người là 'Cái đơn nhất'.",
    icon: <User className="w-5 h-5" />
  },
  {
    id: "c2",
    title: "Nguyên nhân & Kết quả",
    definition: "Nguyên nhân là sự tác động tạo ra biến đổi; Kết quả là những biến đổi xuất hiện.",
    detailedDefinition: "Nguyên nhân là phạm trù chỉ sự tương tác lẫn nhau giữa các mặt trong một sự vật hoặc giữa các sự vật với nhau gây ra những biến đổi nhất định. Kết quả là phạm trù chỉ những biến đổi xuất hiện do sự tương tác giữa các mặt trong một sự vật hoặc giữa các sự vật với nhau gây ra.",
    relationship: "Nguyên nhân là cái có trước, kết quả là cái có sau. Một nguyên nhân có thể sinh ra nhiều kết quả và một kết quả có thể do nhiều nguyên nhân gây ra. Nguyên nhân và kết quả có thể thay đổi vị trí cho nhau (chuỗi nhân quả vô tận). Kết quả có thể tác động trở lại nguyên nhân đã sinh ra nó.",
    meaning: "Vì mối liên hệ nhân quả có tính khách quan nên phải tìm nguyên nhân trong chính thế giới khách quan. Vì một kết quả có thể do nhiều nguyên nhân nên cần phân loại nguyên nhân (chủ yếu, thứ yếu, bên trong, bên ngoài) để có biện pháp xử lý đúng đắn.",
    example: "Sự tương tác giữa dòng điện và dây dẫn (nguyên nhân) làm cho dây dẫn nóng lên (kết quả). Việc học tập chăm chỉ (nguyên nhân) dẫn đến kết quả thi cử tốt (kết quả).",
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: "c3",
    title: "Tất nhiên & Ngẫu nhiên",
    definition: "Tất nhiên do nguyên nhân bên trong quyết định; Ngẫu nhiên do sự kết hợp tình cờ bên ngoài.",
    detailedDefinition: "Tất nhiên là phạm trù chỉ cái do những nguyên nhân cơ bản bên trong của kết cấu vật chất quyết định và trong những điều kiện nhất định nó phải xảy ra như thế chứ không thể khác được. Ngẫu nhiên là phạm trù chỉ cái không do mối liên hệ bản chất, bên trong quyết định mà do sự kết hợp những điều kiện bên ngoài quyết định.",
    relationship: "Tất nhiên và ngẫu nhiên đều tồn tại khách quan. Tất nhiên đóng vai trò chi phối sự phát triển, ngẫu nhiên làm cho sự phát triển đó diễn ra dưới hình thức phong phú. Tất nhiên bao giờ cũng vạch đường đi cho mình thông qua vô số cái ngẫu nhiên. Chúng có thể chuyển hóa cho nhau khi điều kiện thay đổi.",
    meaning: "Trong hoạt động thực tiễn phải dựa vào cái tất nhiên chứ không thể dựa vào cái ngẫu nhiên. Tuy nhiên không được bỏ qua cái ngẫu nhiên vì nó có thể ảnh hưởng đến tiến trình phát triển. Cần tạo điều kiện để cái ngẫu nhiên có lợi chuyển hóa thành cái tất nhiên.",
    example: "Gieo một hạt ngô xuống đất đủ điều kiện thì việc nó nảy mầm thành cây ngô là 'Tất nhiên'. Việc cây ngô đó bị một con sâu cắn lá là 'Ngẫu nhiên'.",
    icon: <ArrowRight className="w-5 h-5" />
  },
  {
    id: "c4",
    title: "Nội dung & Hình thức",
    definition: "Nội dung là tổng hợp các yếu tố tạo thành; Hình thức là phương thức tồn tại của nội dung.",
    detailedDefinition: "Nội dung là phạm trù chỉ tổng hợp tất cả những mặt, những yếu tố, những quá trình tạo nên sự vật. Hình thức là phạm trù chỉ phương thức tồn tại và phát triển của sự vật, là hệ thống các mối liên hệ tương đối bền vững giữa các yếu tố của nội dung đó.",
    relationship: "Nội dung và hình thức luôn gắn bó chặt chẽ. Nội dung quyết định hình thức: nội dung thay đổi thì hình thức cũng phải thay đổi theo. Hình thức có tính độc lập tương đối và tác động trở lại nội dung: nếu phù hợp sẽ thúc đẩy nội dung phát triển, nếu không phù hợp sẽ kìm hãm.",
    meaning: "Không được tách rời nội dung và hình thức hoặc tuyệt đối hóa một trong hai. Trong hoạt động thực tiễn, trước hết phải căn cứ vào nội dung, nhưng cũng phải chú ý thay đổi hình thức cho phù hợp với nội dung mới để thúc đẩy sự phát triển.",
    example: "Nội dung của một cuốn sách là tư tưởng, kiến thức truyền tải; hình thức là cách sắp xếp chương hồi, ngôn ngữ, trình bày. Nội dung của một cơ thể sống là các tế bào, cơ quan; hình thức là cấu trúc tổ chức của chúng.",
    icon: <Layers className="w-5 h-5" />
  },
  {
    id: "c5",
    title: "Bản chất & Hiện tượng",
    definition: "Bản chất là liên hệ ổn định bên trong; Hiện tượng là biểu hiện bên ngoài của bản chất.",
    detailedDefinition: "Bản chất là phạm trù chỉ tổng hợp tất cả những mặt, những mối liên hệ tất nhiên, tương đối ổn định ở bên trong sự vật, quy định sự vận động và phát triển của sự vật đó. Hiện tượng là phạm trù chỉ sự biểu hiện của những mặt, những mối liên hệ đó ra bên ngoài.",
    relationship: "Bản chất và hiện tượng thống nhất với nhau: bản chất nào hiện tượng ấy, bản chất bộc lộ qua hiện tượng. Tuy nhiên chúng cũng đối lập nhau: bản chất là cái bên trong, hiện tượng là cái bên ngoài; bản chất tương đối ổn định, hiện tượng thường xuyên biến đổi; hiện tượng có thể phản ánh sai lệch bản chất (ảo tưởng).",
    meaning: "Muốn hiểu đúng sự vật không được dừng lại ở hiện tượng mà phải đi sâu tìm hiểu bản chất. Tuy nhiên phải thông qua việc phân tích nhiều hiện tượng khác nhau mới tìm ra được bản chất. Cần phân biệt hiện tượng thực và hiện tượng giả (ảo tưởng).",
    example: "Bản chất của xã hội tư bản là sự bóc lột giá trị thặng dư; hiện tượng là việc mua bán sức lao động trên thị trường dường như diễn ra theo nguyên tắc trao đổi ngang giá.",
    icon: <Info className="w-5 h-5" />
  },
  {
    id: "c6",
    title: "Khả năng & Hiện thực",
    definition: "Hiện thực là cái đang tồn tại; Khả năng là cái chưa có nhưng sẽ tới khi đủ điều kiện.",
    detailedDefinition: "Hiện thực là phạm trù chỉ những cái đang tồn tại trong thực tế. Khả năng là phạm trù chỉ cái chưa có, chưa tới nhưng sẽ tới, sẽ có khi có các điều kiện tương ứng hội đủ. Có nhiều loại khả năng: tất nhiên, ngẫu nhiên, thực tế, ảo tưởng, gần, xa...",
    relationship: "Khả năng và hiện thực tồn tại trong mối liên hệ chặt chẽ, không tách rời nhau, luôn chuyển hóa lẫn nhau. Trong những điều kiện nhất định, khả năng biến thành hiện thực và hiện thực mới lại chứa đựng những khả năng mới. Để khả năng biến thành hiện thực cần có các điều kiện khách quan và nhân tố chủ quan.",
    meaning: "Trong hoạt động thực tiễn phải dựa vào hiện thực để xác định phương hướng hành động. Đồng thời phải phát hiện các khả năng để có kế hoạch thúc đẩy khả năng có lợi thành hiện thực. Cần chú trọng nhân tố chủ quan trong việc biến khả năng thành hiện thực.",
    example: "Một hạt giống đang cầm trên tay là 'Hiện thực'. Khả năng nó nảy mầm thành cây khi được gieo xuống đất ẩm là 'Khả năng'. Một học sinh đang học tập là hiện thực, khả năng trở thành kỹ sư trong tương lai là khả năng.",
    icon: <History className="w-5 h-5" />
  }
];

const FEATURE_IMAGES = {
  hero: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1400&q=80",
  overview: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
  principles: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80",
  categories: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80"
};

const PhilosophicalParticles = ({ density = 20, className = "" }: { density?: number; className?: string }) => {
  const particles = useMemo(() => {
    return Array.from({ length: density }).map(() => ({
      xInit: `${Math.random() * 100}%`,
      yInit: `${Math.random() * 100}%`,
      scaleInit: Math.random() * 0.5 + 0.5,
      xAnim: `${Math.random() * 10 - 5}%`,
      opacityMax: Math.random() * 0.4 + 0.2,
      duration: Math.random() * 5 + 5,
      delay: Math.random() * 3,
    }));
  }, [density]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-primary/30 dark:bg-primary/50 rounded-full blur-[1px]"
          initial={{
            x: p.xInit,
            y: p.yInit,
            opacity: 0,
            scale: p.scaleInit,
          }}
          animate={{
            y: ["0%", "15%", "-15%", "0%"],
            x: ["0%", p.xAnim, "0%"],
            opacity: [0, p.opacityMax, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
};
// -------------------------------------------------------------------

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Xin chào! Tôi là trợ lý ảo chuyên về Phép biện chứng duy vật. Bạn muốn tìm hiểu về quy luật nào hôm nay?" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<Record<string, boolean>>({});
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "light" | "dark") || "light";
    }
    return "light";
  });
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPhotoURL, setNewPhotoURL] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedPrinciple, setSelectedPrinciple] = useState<Principle | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatOpen]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create profile
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          const initialProfile = {
            displayName: currentUser.displayName || "Người dùng",
            photoURL: currentUser.photoURL || ""
          };
          await setDoc(doc(db, "users", currentUser.uid), {
            ...initialProfile,
            email: currentUser.email || "",
            provider: currentUser.providerData?.[0]?.providerId || "unknown",
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          }, { merge: true });
          setProfile(initialProfile);
        }
      } else {
        setProfile(null);
        setMessages([{ role: "model", text: "Xin chào! Tôi là trợ lý ảo chuyên về Phép biện chứng duy vật. Bạn muốn tìm hiểu về quy luật nào hôm nay?" }]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Chat History Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "messages"),
      orderBy("timestamp", "asc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history: Message[] = snapshot.docs.map(doc => ({
        role: doc.data().role,
        text: doc.data().text,
        timestamp: doc.data().timestamp
      }));

      if (history.length > 0) {
        setMessages(history);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const resetAuthForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRegisterName("");
    setAuthError("");
  };

  const getReadableAuthError = (error: any, mode: "login" | "register") => {
    const code = error?.code;
    switch (code) {
      case "auth/email-already-in-use":
        return "Email này đã được sử dụng. Hãy đăng nhập hoặc dùng Google nếu bạn đã đăng ký bằng Google.";
      case "auth/account-exists-with-different-credential":
        return "Email này đã tồn tại với phương thức đăng nhập khác. Hãy dùng đúng phương thức trước đó.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
      case "auth/invalid-login-credentials":
        return "Email hoặc mật khẩu không chính xác.";
      case "auth/popup-closed-by-user":
        return "Bạn đã đóng cửa sổ đăng nhập Google.";
      case "auth/too-many-requests":
        return "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.";
      case "auth/invalid-email":
        return "Email không hợp lệ.";
      case "auth/weak-password":
        return "Mật khẩu quá yếu. Hãy dùng ít nhất 6 ký tự.";
      default:
        return mode === "register"
          ? "Đăng ký thất bại. Vui lòng thử lại."
          : "Đăng nhập thất bại. Vui lòng thử lại.";
    }
  };

  const handleLogin = () => {
    resetAuthForm();
    setIsAuthDialogOpen(true);
    setAuthMode("login");
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setIsAuthSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthDialogOpen(false);
      resetAuthForm();
      toast.success("Đăng nhập thành công!");
    } catch (error: any) {
      console.error("Google login failed", error);
      if (error?.code === "auth/account-exists-with-different-credential") {
        setAuthError("Email này đã đăng ký bằng mật khẩu. Hãy đăng nhập bằng email và mật khẩu trước.");
      } else {
        setAuthError(getReadableAuthError(error, "login"));
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setAuthError("");

    if (!normalizedEmail) {
      setAuthError("Vui lòng nhập email.");
      return;
    }

    if (authMode === "register") {
      if (password !== confirmPassword) {
        setAuthError("Mật khẩu xác nhận không khớp.");
        return;
      }
      if (password.length < 6) {
        setAuthError("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }
      if (!registerName.trim()) {
        setAuthError("Vui lòng nhập tên của bạn.");
        return;
      }
    }

    setIsAuthSubmitting(true);

    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);

      if (authMode === "register") {
        if (signInMethods.includes("google.com") && !signInMethods.includes("password")) {
          setAuthError("Email này đã được dùng để đăng nhập bằng Google. Bạn không thể đăng ký mật khẩu mới cho email này ở đây. Hãy dùng nút Google để đăng nhập.");
          return;
        }

        if (signInMethods.includes("password")) {
          setAuthError("Email này đã có tài khoản. Hãy đăng nhập thay vì đăng ký mới.");
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        await updateProfile(userCredential.user, {
          displayName: registerName.trim()
        });

        await setDoc(doc(db, "users", userCredential.user.uid), {
          displayName: registerName.trim(),
          photoURL: "",
          email: normalizedEmail,
          provider: "password",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        setIsAuthDialogOpen(false);
        resetAuthForm();
        toast.success("Đăng ký thành công!");
        return;
      }

      if (signInMethods.includes("google.com") && !signInMethods.includes("password")) {
        setAuthError("Email này đang dùng để đăng nhập bằng Google. Hãy bấm nút 'Tiếp tục với Google'.");
        return;
      }

      if (signInMethods.length === 0) {
        setAuthError("Email này chưa có tài khoản. Bạn hãy đăng ký trước.");
        return;
      }

      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      setIsAuthDialogOpen(false);
      resetAuthForm();
      toast.success("Đăng nhập thành công!");
    } catch (error: any) {
      console.error(`${authMode} failed`, error);
      setAuthError(getReadableAuthError(error, authMode));
    } finally {
      setIsAuthSubmitting(false);
    }
  };


  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setAuthError("Hãy nhập email trước khi yêu cầu đặt lại mật khẩu.");
      return;
    }

    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      if (signInMethods.includes("google.com") && !signInMethods.includes("password")) {
        setAuthError("Email này đang dùng Google để đăng nhập nên không thể đặt lại mật khẩu tại đây.");
        return;
      }

      await sendPasswordResetEmail(auth, normalizedEmail);
      toast.success("Đã gửi email đặt lại mật khẩu.");
    } catch (error: any) {
      console.error("Reset password failed", error);
      setAuthError(getReadableAuthError(error, "login"));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsChatOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const uploadToCloudinary = async (dataUrl: string) => {
    const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary configuration missing");
    }

    const formData = new FormData();
    formData.append("file", dataUrl);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Cloudinary upload error response:", errorData);
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleUpdateProfile = async () => {
    if (!user || !newDisplayName.trim()) return;
    setIsUpdatingProfile(true);
    console.log("Starting profile update...");
    try {
      let photoURL = newPhotoURL.trim() || profile?.photoURL || "";

      // If newPhotoURL is a data URL (starts with data:image/), upload to Cloudinary
      if (photoURL.startsWith("data:image/")) {
        console.log("Uploading image to Cloudinary...");
        photoURL = await uploadToCloudinary(photoURL);
        console.log("Got Cloudinary URL:", photoURL);
      }

      const updatedProfile = {
        displayName: newDisplayName.trim(),
        photoURL: photoURL
      };
      console.log("Updating Firestore...");
      await setDoc(doc(db, "users", user.uid), {
        ...updatedProfile,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log("Firestore updated.");
      setProfile(updatedProfile);
      setIsProfileDialogOpen(false);
      toast.success("Cập nhật hồ sơ thành công!");
    } catch (error) {
      console.error("Update profile failed", error);
      toast.error("Cập nhật hồ sơ thất bại.");
    } finally {
      setIsUpdatingProfile(false);
      console.log("Profile update finished.");
    }
  };

  const [laws, setLaws] = useState<Law[]>([
    {
      id: "law1",
      title: "Quy luật Thống nhất và Đấu tranh của các mặt đối lập",
      shortTitle: "Quy luật Mâu thuẫn",
      subtitle: "Nguồn gốc và động lực của sự phát triển",
      icon: <Zap className="w-6 h-6 text-accent" />,
      imagePrompt: "An abstract artistic representation of two opposing forces (like fire and ice or light and shadow) swirling together to create a new energy, symbolic of dialectical contradiction and unity, bright colors, non-black background, academic style.",
      content: `
Quy luật này là **hạt nhân** của phép biện chứng, chỉ ra nguồn gốc và động lực của sự vận động.

- **Mặt đối lập:** Các thuộc tính có khuynh hướng biến đổi trái ngược nhau.
- **Thống nhất:** Sự nương tựa, đồng nhất và tác động ngang nhau.
- **Đấu tranh:** Sự bài trừ, phủ định lẫn nhau giữa các mặt đối lập.

**Cơ chế:** Việc giải quyết mâu thuẫn thông qua đấu tranh chính là động lực làm cái cũ mất đi, cái mới ra đời.
      `,
      example: "Mâu thuẫn giữa lực lượng sản xuất và quan hệ sản xuất thúc đẩy sự thay đổi hình thái kinh tế - xã hội."
    },
    {
      id: "law2",
      title: "Quy luật Lượng - Chất",
      shortTitle: "Quy luật Lượng - Chất",
      subtitle: "Cách thức của sự vận động và phát triển",
      icon: <Layers className="w-6 h-6 text-accent" />,
      imagePrompt: "A visual metaphor for quantity changing into quality: many small water droplets accumulating until they suddenly transform into a crystalline ice structure or a powerful wave, bright and clear aesthetics, symbolic of the law of quantity and quality.",
      content: `
Quy luật này chỉ ra **cách thức** vận động: sự tích lũy về lượng dẫn đến sự thay đổi về chất.

- **Chất:** Thuộc tính khách quan làm sự vật là nó chứ không phải cái khác.
- **Lượng:** Quy định về quy mô, số lượng, trình độ, nhịp độ.
- **Cơ chế:** Lượng đổi đạt đến **Điểm nút** sẽ tạo ra **Bước nhảy** làm thay đổi căn bản về chất.

**Ý nghĩa:** Cần tích lũy đủ về lượng, tránh nôn nóng đốt cháy giai đoạn hoặc bảo thủ trì trệ.
      `,
      example: "Học sinh tích lũy kiến thức (lượng) qua nhiều năm để vượt qua kỳ thi tốt nghiệp (bước nhảy về chất)."
    },
    {
      id: "law3",
      title: "Quy luật Phủ định của phủ định",
      shortTitle: "Quy luật Phủ định",
      subtitle: "Khuynh hướng của sự phát triển",
      icon: <RefreshCw className="w-6 h-6 text-accent" />,
      imagePrompt: "A beautiful glowing spiral or helical staircase rising upwards, with each level reflecting the one below but at a higher plane, symbolic of the law of negation of negation and the spiral nature of development, bright and optimistic colors.",
      content: `
Quy luật này chỉ ra **khuynh hướng** phát triển: tiến lên theo chu kỳ, quanh co như đường xoáy ốc.

- **Phủ định biện chứng:** Sự tự phủ định, tự phát triển; có tính khách quan và kế thừa.
- **Kế thừa:** Giữ lại và cải tạo những yếu tố tích cực từ cái cũ.
- **Đường xoáy ốc:** Phát triển không theo đường thẳng mà dường như quay lại cái cũ nhưng ở trình độ cao hơn.

**Ý nghĩa:** Xây dựng thái độ lạc quan, ủng hộ cái mới tiến bộ.
      `,
      example: "Hạt thóc -> Cây lúa -> Những hạt thóc mới (nhiều hơn, chất lượng hơn)."
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    const newMessage: Message = { role: "user", text: userMessage };

    // If not logged in, just local state
    if (!user) {
      setMessages(prev => [...prev, newMessage]);
    } else {
      // Save to Firestore
      await addDoc(collection(db, "users", user.uid, "messages"), {
        ...newMessage,
        userId: user.uid,
        timestamp: serverTimestamp()
      });
    }

    setInputValue("");
    setIsLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await getChatResponse(userMessage, history);
    const modelMessage: Message = { role: "model", text: response || "Xin lỗi, tôi không thể trả lời lúc này." };

    if (!user) {
      setMessages(prev => [...prev, modelMessage]);
    } else {
      // Save to Firestore
      await addDoc(collection(db, "users", user.uid, "messages"), {
        ...modelMessage,
        userId: user.uid,
        timestamp: serverTimestamp()
      });
    }

    setIsLoading(false);
  };

  const handleGenerateImage = async (lawId: string) => {
    const law = laws.find(l => l.id === lawId);
    if (!law || isGeneratingImage[lawId]) return;

    setIsGeneratingImage(prev => ({ ...prev, [lawId]: true }));
    const url = await generateImage(law.imagePrompt);

    if (url) {
      setLaws(prev => prev.map(l => l.id === lawId ? { ...l, imageUrl: url } : l));
    }
    setIsGeneratingImage(prev => ({ ...prev, [lawId]: false }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-right" richColors />
      {/* Navigation */}
      <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="text-xl font-serif font-bold">Triết Học Biện Chứng</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-6 mr-4 border-r pr-6">
              <a href="#overview" className="text-sm font-medium hover:text-primary transition-colors">Tổng quan</a>
              <a href="#principles" className="text-sm font-medium hover:text-primary transition-colors">Nguyên lý</a>
              <a href="#laws" className="text-sm font-medium hover:text-primary transition-colors">Quy luật</a>
              <a href="#categories" className="text-sm font-medium hover:text-primary transition-colors">Phạm trù</a>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full w-9 h-9">
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "relative h-9 w-9 rounded-full p-0")}>
                    <Avatar className="h-9 w-9 border border-primary/10">
                      <AvatarImage src={profile?.photoURL || user.photoURL || ""} alt={profile?.displayName || ""} />
                      <AvatarFallback>{(profile?.displayName || user.displayName || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{profile?.displayName || user.displayName}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setNewDisplayName(profile?.displayName || user.displayName || "");
                      setNewPhotoURL(profile?.photoURL || user.photoURL || "");
                      setIsProfileDialogOpen(true);
                    }}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Tùy chỉnh hồ sơ</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsChatOpen(true)}>
                      <History className="mr-2 h-4 w-4" />
                      <span>Lịch sử trò chuyện</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} variant="destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Đăng xuất</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="default" size="sm" onClick={handleLogin} className="rounded-full px-5 h-9">
                  <LogIn className="mr-2 h-4 w-4" /> Đăng nhập
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={() => setIsChatOpen(true)} className="rounded-full h-9">
                Hỏi Chatbot
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section
          id="intro"
          className="relative pt-32 pb-24 overflow-hidden z-10 bg-fixed bg-center bg-cover"
          style={{ backgroundImage: 'url("/images/Section1.png")' }}
        >
          {/* LỚP PHỦ THÔNG MINH: 
      - Light mode: bg-black/10 (phủ một lớp đen siêu mỏng 10% để ảnh giữ nguyên màu sắc gốc nhưng vẫn hỗ trợ đọc chữ)
      - Dark mode: dark:bg-background/40 (phủ lớp tối hơn để hợp với giao diện đêm)
  */}
          <div className="absolute inset-0 bg-black/10 dark:bg-background/40 backdrop-blur-[0.5px] -z-10" />

          {/* Giữ nguyên hiệu ứng hạt lá lơi nhưng giảm opacity để không lấn át ảnh nền */}
          <PhilosophicalParticles density={25} className="-z-10 opacity-50" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* 1. Badge: Đổi text-primary thành text-white và border-primary thành border-white/40 */}
                <Badge variant="outline" className="mb-8 px-4 py-1 border-white/40 text-white font-medium tracking-wider uppercase text-[10px] drop-shadow-sm">
                  Triết học Mác - Lênin
                </Badge>

                {/* 2. Tiêu đề chính (h1): Thêm text-white và drop-shadow-lg */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl mb-8 leading-[0.9] tracking-tight font-serif italic text-white drop-shadow-lg">
                  Phép Biện Chứng <br className="hidden md:block" />
                  {/* Duy Vật: Đổi text-primary thành text-white */}
                  <span className="text-white not-italic">Duy Vật</span>
                </h1>

                {/* 3. Đoạn mô tả (p): Đổi text-black thành text-white cố định */}
                <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto mb-12 font-sans font-medium leading-relaxed drop-shadow-xl">
                  Học thuyết khoa học nghiên cứu những quy luật chung nhất của sự vận động và phát triển của tự nhiên, xã hội và tư duy.
                </p>

                <div className="max-w-4xl mx-auto mb-12 overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/10 dark:bg-zinc-900/50 shadow-2xl backdrop-blur-sm">
                  <img
                    src={FEATURE_IMAGES.hero}
                    alt="Không gian học tập triết học"
                    className="h-[260px] md:h-[360px] w-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-6">
                  <a
                    href="#overview"
                    className={cn(buttonVariants({ size: "lg", variant: "default" }), "rounded-full px-10 h-14 text-base shadow-lg shadow-primary/20 flex items-center justify-center")}
                  >
                    Bắt đầu tìm hiểu <ArrowRight className="ml-2 w-5 h-5" />
                  </a>
                  <Button size="lg" variant="outline" className="rounded-full px-10 h-14 text-base border-primary/20 hover:bg-primary/5" onClick={() => setIsChatOpen(true)}>
                    Trò chuyện với AI
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        {/* Overview Section */}
        <section
          id="overview"
          className="py-24 relative z-10 bg-center bg-cover"
          style={{ backgroundImage: 'url("/images/Section2.png")' }}
        >
          {/* Lớp phủ chuyển sắc từ trên xuống dưới */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 to-white/70 dark:from-zinc-950/90 dark:to-zinc-950/80 backdrop-blur-md -z-10" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
              <div>
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none rounded-full px-4">Tổng quan</Badge>
                <h2 className="text-4xl md:text-5xl font-serif italic mb-8">Khái niệm & Đặc điểm</h2>
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-secondary/50 dark:bg-zinc-900 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">Biện chứng là gì?</h4>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        Biện chứng là phương pháp xem xét những sự vật và những phản ánh của chúng trong tư tưởng, trong mối quan hệ qua lại lẫn nhau, trong sự ràng buộc, vận động, phát sinh và tiêu vong của chúng.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                          <span className="text-[10px] font-mono uppercase text-primary block mb-1">Khách quan</span>
                          <p className="text-xs">Biện chứng của thế giới vật chất.</p>
                        </div>
                        <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                          <span className="text-[10px] font-mono uppercase text-primary block mb-1">Chủ quan</span>
                          <p className="text-xs">Tư duy biện chứng của con người.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-secondary/50 dark:bg-zinc-900 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">Đặc điểm & Vai trò</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Phép biện chứng duy vật là sự thống nhất giữa thế giới quan duy vật và phương pháp luận biện chứng. Đây là học thuyết nghiên cứu, khái quát biện chứng của thế giới thành các nguyên lý, quy luật khoa học nhằm xây dựng phương pháp luận khoa học cho nhận thức và cải tạo thực tiễn.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/5 rounded-[3rem] blur-2xl" />
                <div className="relative bg-secondary/20 dark:bg-zinc-900/50 border border-primary/5 p-10 rounded-[3rem] backdrop-blur-sm">
                  <div className="mb-8 overflow-hidden rounded-[2rem] border border-primary/10">
                    <img src={FEATURE_IMAGES.overview} alt="Sách và ghi chú học tập" className="h-56 w-full object-cover" />
                  </div>
                  <h4 className="text-2xl font-serif italic mb-6">Cấu trúc nội dung cốt lõi</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm">
                      <span className="font-medium">Nguyên lý cơ bản</span>
                      <Badge variant="secondary" className="rounded-full">02</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm">
                      <span className="font-medium">Cặp phạm trù</span>
                      <Badge variant="secondary" className="rounded-full">06</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm">
                      <span className="font-medium">Quy luật cơ bản</span>
                      <Badge variant="secondary" className="rounded-full">03</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Principles Section */}
        <section id="principles" className="py-32 bg-secondary/10 dark:bg-zinc-900/30 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto mb-20">
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none rounded-full px-4">Chuyên mục 1</Badge>
              <h2 className="text-5xl md:text-6xl font-serif italic mb-8">Hai Nguyên Lý Cơ Bản</h2>
              <div className="p-8 bg-white dark:bg-zinc-900 rounded-[2rem] border border-primary/5 shadow-xl shadow-primary/5">
                <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed italic">
                  "Nguyên lý" được hiểu như các tiên đề trong khoa học cụ thể, là những tri thức không dễ chứng minh nhưng đã được xác nhận bởi thực tiễn của nhiều thế hệ con người, đòi hỏi con người phải tuân thủ nghiêm ngặt để không mắc sai lầm.
                </p>
              </div>
            </div>

            <div className="max-w-5xl mx-auto mb-10 overflow-hidden rounded-[2.5rem] border border-primary/10 bg-white dark:bg-zinc-900 shadow-xl shadow-primary/5">
              <img src={FEATURE_IMAGES.principles} alt="Không gian thư viện và tri thức" className="h-56 md:h-72 w-full object-cover" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {PRINCIPLES.map((p, index) => (
                <Dialog key={p.id}>
                  <DialogTrigger
                    render={
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPrinciple(p)}
                        className="group relative aspect-square rounded-[3rem] bg-white dark:bg-zinc-900 p-10 shadow-2xl shadow-primary/5 border border-primary/5 flex flex-col items-center justify-center text-center transition-all duration-500 hover:border-primary/20"
                      >
                        <div className="w-24 h-24 rounded-3xl bg-primary/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                          {p.icon}
                        </div>
                        <h3 className="text-3xl font-serif italic mb-4">{p.title}</h3>
                        <p className="text-muted-foreground text-lg font-light leading-relaxed max-w-xs">
                          {p.description}
                        </p>
                        <div className="mt-8 flex items-center gap-2 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Xem chi tiết <ArrowRight className="w-5 h-5" />
                        </div>
                      </motion.button>
                    }
                  />
                  <DialogContent className="sm:max-w-[650px] rounded-[3rem] p-0 overflow-hidden border-none bg-transparent shadow-none">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-zinc-950 p-6 md:p-12 rounded-[3rem] border border-primary/10 shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                      <DialogHeader className="mb-8">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            {p.icon}
                          </div>
                          <Badge variant="outline" className="border-primary/20 text-primary">Nguyên lý {index + 1}</Badge>
                        </div>
                        <DialogTitle className="text-4xl font-serif italic leading-tight">
                          {p.title}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-8">
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary opacity-60">Khái niệm</h5>
                          <p className="text-lg leading-relaxed text-zinc-800 dark:text-zinc-200 font-light">
                            {p.detailedDefinition}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <h5 className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary opacity-60">Tính chất</h5>
                          <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                            {p.detailedProperties}
                          </p>
                        </div>

                        <div className="p-8 bg-primary/5 dark:bg-primary/10 rounded-[2.5rem] border border-primary/10">
                          <h5 className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary opacity-60 mb-4">Ý nghĩa phương pháp luận</h5>
                          <p className="italic font-serif text-xl leading-relaxed text-primary/90">
                            {p.meaning}
                          </p>
                        </div>
                      </div>

                      <DialogFooter className="mt-10">
                        <Button
                          variant="outline"
                          className="rounded-full px-8 h-12 border-primary/20 hover:bg-primary/5"
                          onClick={() => {
                            const closeButton = document.querySelector('[data-radix-collection-item]') as HTMLElement;
                            closeButton?.click();
                          }}
                        >
                          Đóng lại
                        </Button>
                      </DialogFooter>
                    </motion.div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        </section>
        <section
          id="laws"
          className="py-32 relative z-10 bg-fixed bg-center bg-cover"
          style={{ backgroundImage: 'url("/images/Section3.png")' }}
        >
          {/* Lớp phủ màu đậm và làm mờ sâu */}
          <div className="absolute inset-0 bg-secondary/80 dark:bg-zinc-900/90 backdrop-blur-lg -z-10" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl mb-6 font-serif italic">Hệ thống Quy luật</h2>
              <div className="w-20 h-1 bg-primary mx-auto mb-6 rounded-full" />
              <p className="text-muted-foreground dark:text-zinc-400 max-w-xl mx-auto text-lg font-light">
                Ba quy luật cơ bản phản ánh ba khía cạnh khác nhau của quá trình phát triển không ngừng.
              </p>
            </div>

            <Tabs defaultValue="law1" className="w-full max-w-6xl mx-auto">
              <TabsList className="flex flex-wrap md:grid w-full md:grid-cols-3 h-auto p-2 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-primary/10 rounded-2xl mb-12">
                {laws.map((law) => (
                  <TabsTrigger
                    key={law.id}
                    value={law.id}
                    className="flex-1 py-4 text-muted-foreground data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-primary data-[state=active]:shadow-xl data-[state=active]:shadow-primary/5 rounded-xl transition-all duration-300"
                  >
                    <span className="text-sm md:text-base font-bold tracking-tight">{law.shortTitle}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {laws.map((law) => (
                <TabsContent key={law.id} value={law.id} className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid md:grid-cols-12 bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl shadow-primary/5 overflow-hidden border border-primary/5"
                  >
                    <div className="md:col-span-5 bg-primary/[0.02] p-10 flex flex-col border-b md:border-b-0 md:border-r border-primary/5">
                      <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-xl shadow-primary/5 mb-8 transform -rotate-3">
                        {law.icon}
                      </div>
                      <h3 className="text-3xl mb-4 font-serif leading-tight">{law.title}</h3>
                      <p className="text-base text-accent font-medium italic mb-10 opacity-80">{law.subtitle}</p>

                      {/* AI Image Generation Area */}
                      <div className="w-full mt-auto">
                        <div className="aspect-[4/3] w-full rounded-3xl bg-secondary/50 border border-dashed border-primary/20 flex flex-col items-center justify-center overflow-hidden relative group shadow-inner">
                          {law.imageUrl ? (
                            <>
                              <img
                                src={law.imageUrl}
                                alt={law.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                <Button
                                  variant="secondary"
                                  className="rounded-full px-6 shadow-xl"
                                  onClick={() => handleGenerateImage(law.id)}
                                  disabled={isGeneratingImage[law.id]}
                                >
                                  {isGeneratingImage[law.id] ? "Đang tạo..." : "Tạo lại ảnh AI"}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="p-8 flex flex-col items-center text-center">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Zap className="w-6 h-6 text-primary/40" />
                              </div>
                              <p className="text-xs text-muted-foreground mb-6 font-medium">Chưa có hình ảnh minh họa AI</p>
                              <Button
                                variant="outline"
                                className="rounded-full border-primary/20 hover:bg-primary/5"
                                onClick={() => handleGenerateImage(law.id)}
                                disabled={isGeneratingImage[law.id]}
                              >
                                {isGeneratingImage[law.id] ? "Đang tạo..." : "Tạo ảnh minh họa AI"}
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-4 italic text-center opacity-60">
                          * Hình ảnh được tạo ngẫu nhiên bởi AI dựa trên nội dung quy luật
                        </p>
                      </div>
                    </div>
                    <div className="md:col-span-7 p-12 lg:p-16">
                      <div className="prose prose-slate dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans text-lg">
                        <ReactMarkdown>{law.content}</ReactMarkdown>
                      </div>

                      <Separator className="my-10 opacity-50" />

                      <div className="p-8 bg-accent/5 dark:bg-accent/10 rounded-3xl border border-accent/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <BookOpen className="w-12 h-12 text-accent" />
                        </div>
                        <h4 className="text-accent font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-widest">
                          <span className="w-8 h-[1px] bg-accent/30" />
                          Ví dụ minh họa
                        </h4>
                        <p className="text-foreground/80 dark:text-zinc-300 italic font-serif text-xl leading-relaxed">
                          "{law.example}"
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* Categories Section */}
        <section
          id="categories"
          className="py-32 relative z-10 bg-center bg-cover overflow-hidden"
          style={{ backgroundImage: 'url("/images/Section4.png")' }}
        >
          {/* Lớp kính mờ mạnh nhất (backdrop-blur-xl) */}
          <div className="absolute inset-0 bg-white/70 dark:bg-zinc-950/80 backdrop-blur-xl -z-10" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
              <div className="max-w-2xl">
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none rounded-full px-4">Phạm trù</Badge>
                <h2 className="text-5xl md:text-6xl font-serif italic mb-6">Sáu Cặp Phạm Trù</h2>
                <p className="text-muted-foreground text-xl font-light leading-relaxed">
                  Khám phá các mối liên hệ phổ biến nhất thông qua giao diện tương tác hiện đại.
                </p>
              </div>
              <div className="hidden lg:block text-right">
                <div className="text-8xl font-serif italic opacity-5 text-primary leading-none">06</div>
                <div className="text-sm font-mono uppercase tracking-widest opacity-40">Interactive Categories</div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto mb-10 overflow-hidden rounded-[2.5rem] border border-primary/10 bg-secondary/10 dark:bg-zinc-900/50 shadow-xl shadow-primary/5">
              <img src={FEATURE_IMAGES.categories} alt="Bút viết và tri thức" className="h-56 md:h-72 w-full object-cover" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
              {CATEGORIES.map((cat, index) => (
                <Dialog key={cat.id}>
                  <DialogTrigger
                    render={
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedCategory(cat)}
                        className="group relative aspect-square rounded-[2.5rem] bg-secondary/10 dark:bg-zinc-900/50 border border-primary/5 flex flex-col items-center justify-center p-6 transition-all duration-500 hover:bg-primary hover:shadow-2xl hover:shadow-primary/20"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center mb-6 transition-colors">
                          <div className="text-primary group-hover:text-white transition-colors scale-125">
                            {cat.icon}
                          </div>
                        </div>
                        <span className="text-lg md:text-xl font-serif italic text-center group-hover:text-white transition-colors">
                          {cat.title}
                        </span>

                        {/* Decorative elements */}
                        <div className="absolute top-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-5 h-5 text-white" />
                        </div>
                      </motion.button>
                    }
                  />
                  <DialogContent className="sm:max-w-[600px] rounded-[3rem] p-0 overflow-hidden border-none bg-transparent shadow-none">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-zinc-950 p-6 md:p-12 rounded-[3rem] border border-primary/10 shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                      <DialogHeader className="mb-8">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            {cat.icon}
                          </div>
                          <Badge variant="outline" className="border-primary/20 text-primary">Phạm trù {index + 1}</Badge>
                        </div>
                        <DialogTitle className="text-4xl font-serif italic leading-tight">
                          {cat.title}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-8">
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary opacity-60">Khái niệm chi tiết</h5>
                          <p className="text-lg leading-relaxed text-zinc-800 dark:text-zinc-200 font-light">
                            {cat.detailedDefinition}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <h5 className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary opacity-60">Mối quan hệ biện chứng</h5>
                          <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                            {cat.relationship}
                          </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="p-6 bg-secondary/30 dark:bg-zinc-900/50 rounded-[2rem] border border-primary/5">
                            <h5 className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary opacity-60 mb-3">Ý nghĩa phương pháp luận</h5>
                            <p className="italic font-serif text-lg leading-relaxed">
                              {cat.meaning}
                            </p>
                          </div>
                          <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-[2rem] border border-primary/10">
                            <h5 className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary opacity-60 mb-3">Ví dụ thực tiễn</h5>
                            <p className="text-lg leading-relaxed font-light">
                              {cat.example}
                            </p>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="mt-10">
                        <Button
                          variant="outline"
                          className="rounded-full px-8 h-12 border-primary/20 hover:bg-primary/5"
                          onClick={() => {
                            const closeButton = document.querySelector('[data-radix-collection-item]') as HTMLElement;
                            closeButton?.click();
                          }}
                        >
                          Đóng lại
                        </Button>
                      </DialogFooter>
                    </motion.div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        </section>
        <section className="py-32 bg-white dark:bg-zinc-950 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl mb-6 font-serif italic">Giá trị cốt lõi</h2>
                <p className="text-muted-foreground dark:text-zinc-400 text-lg font-light">Tầm quan trọng của Phép biện chứng trong nhận thức và thực tiễn.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-10">
                <div className="group p-10 rounded-[2rem] bg-secondary/20 dark:bg-zinc-900/50 border border-primary/5 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <Layers className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-2xl mb-4 font-serif">Thế giới quan</h4>
                  <p className="text-muted-foreground dark:text-zinc-400 leading-relaxed font-light">Giúp con người nhìn nhận thế giới trong sự liên hệ, vận động và phát triển không ngừng.</p>
                </div>
                <div className="group p-10 rounded-[2rem] bg-secondary/20 dark:bg-zinc-900/50 border border-primary/5 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <RefreshCw className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-2xl mb-4 font-serif">Phương pháp luận</h4>
                  <p className="text-muted-foreground dark:text-zinc-400 leading-relaxed font-light">Cung cấp công cụ tư duy khoa học để phân tích và giải quyết các vấn đề phức tạp.</p>
                </div>
                <div className="group p-10 rounded-[2rem] bg-secondary/20 dark:bg-zinc-900/50 border border-primary/5 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-2xl mb-4 font-serif">Thực tiễn</h4>
                  <p className="text-muted-foreground dark:text-zinc-400 leading-relaxed font-light">Hướng dẫn hành động cải tạo thế giới dựa trên các quy luật khách quan.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-20 border-t bg-white dark:bg-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom,var(--color-primary)_0%,transparent_70%)] opacity-[0.02]" />
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight">Triết Học Biện Chứng</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-8 mb-12">
              <a href="#overview" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Tổng quan</a>
              <a href="#principles" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Nguyên lý</a>
              <a href="#laws" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Quy luật</a>
              <a href="#categories" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Phạm trù</a>
              <button onClick={() => setIsChatOpen(true)} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Trợ lý AI</button>
            </nav>
            <Separator className="max-w-xs mx-auto mb-12 opacity-50" />
            <p className="text-sm text-muted-foreground font-light italic">
              © 2026 — Kiến thức nền tảng cho tư duy khoa học và hiện đại.
            </p>
          </div>
        </div>
      </footer>

      {/* Chatbot Toggle Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 px-6 rounded-full shadow-[0_0_20px_rgba(230,81,0,0.5)] z-50 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white flex items-center gap-2 transition-all duration-300 hover:scale-105 animate-pulse"
        onClick={() => setIsChatOpen(true)}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="font-bold text-sm tracking-wide">AI Triết học</span>
      </Button>

      {/* Chatbot Interface */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-6 right-6 w-[95vw] md:w-[600px] h-[80vh] max-h-[800px] z-50 flex flex-col bg-white dark:bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden border border-primary/5"
          >
            <div className="p-6 bg-gradient-to-br from-white to-orange-50 dark:from-zinc-950 dark:to-zinc-900 border-b border-orange-100/50 dark:border-orange-900/20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user ? (
                    <Avatar className="w-12 h-12 rounded-2xl border-2 border-white shadow-lg shadow-orange-100 dark:shadow-none">
                      <AvatarImage src={profile?.photoURL || user.photoURL || ""} />
                      <AvatarFallback className="bg-orange-100 text-orange-600">
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <div>
                  <p className="font-serif font-bold text-lg leading-none mb-1 text-zinc-900 dark:text-zinc-100">
                    Triết Học AI
                  </p>
                  {user && (
                    <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">
                      Chào, {profile?.displayName || user.displayName?.split(' ')[0]}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 transition-colors" onClick={() => setIsChatOpen(false)}>
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-secondary/[0.02] custom-scrollbar">
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm leading-relaxed ${msg.role === "user"
                      ? "bg-primary text-white dark:text-zinc-950 rounded-tr-none shadow-lg shadow-primary/20"
                      : "bg-white dark:bg-card text-foreground rounded-tl-none shadow-sm border border-primary/5"
                      }`}>
                      <div className={cn("prose prose-sm max-w-none", msg.role === "user" ? "prose-invert" : "prose-slate dark:prose-invert")}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-card p-4 rounded-[1.5rem] rounded-tl-none shadow-sm border border-primary/5 flex gap-1.5">
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-primary/40 rounded-full" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-primary/40 rounded-full" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-primary/40 rounded-full" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-950 border-t border-primary/5">
              <form
                className="flex gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <Input
                  placeholder="Nhập câu hỏi cho chatbot"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 h-12 rounded-full px-6 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20 focus-visible:border-primary/20 transition-all"
                />
                <Button type="submit" size="icon" className="w-12 h-12 rounded-full shadow-lg shadow-primary/20" disabled={isLoading || !inputValue.trim()}>
                  <Send className="w-5 h-5" />
                </Button>
              </form>
              <p className="text-[10px] text-center text-muted-foreground mt-4 font-medium tracking-wide opacity-60">
                Sử dụng trí tuệ nhân tạo để hỗ trợ học tập
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Profile Customization Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Tùy chỉnh hồ sơ</DialogTitle>
            <DialogDescription>
              Thay đổi tên hiển thị và ảnh đại diện của bạn.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex justify-center">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-primary/10">
                  <AvatarImage src={newPhotoURL || profile?.photoURL || user?.photoURL || ""} />
                  <AvatarFallback className="text-2xl">{(newDisplayName || user?.displayName || "U").charAt(0)}</AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewPhotoURL(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium px-1">Tên hiển thị</label>
              <Input
                id="name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Nhập tên của bạn..."
                className="rounded-full h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="photo" className="text-sm font-medium px-1">URL Ảnh đại diện</label>
              <Input
                id="photo"
                value={newPhotoURL}
                onChange={(e) => setNewPhotoURL(e.target.value)}
                placeholder="https://..."
                className="rounded-full h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)} className="rounded-full">Hủy</Button>
            <Button onClick={handleUpdateProfile} className="rounded-full px-8" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authentication Dialog */}
      <Dialog open={isAuthDialogOpen} onOpenChange={(open) => { setIsAuthDialogOpen(open); if (!open) resetAuthForm(); }}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-8 text-white text-center">
            <h2 className="text-3xl font-serif italic mb-2">
              {authMode === "login" ? "Chào mừng trở lại" : "Tham gia cùng chúng tôi"}
            </h2>
            <p className="text-primary-foreground/80 text-sm">
              {authMode === "login" ? "Đăng nhập để tiếp tục hành trình triết học" : "Tạo tài khoản để lưu trữ lịch sử trò chuyện"}
            </p>
          </div>

          <div className="p-8 bg-white dark:bg-zinc-950">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === "register" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Họ và tên</label>
                  <Input
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="rounded-xl h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="rounded-xl h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Mật khẩu</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
                  required
                />
              </div>

              {authMode === "register" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Xác nhận mật khẩu</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-xl h-12 bg-secondary/20 dark:bg-zinc-900 border-transparent focus-visible:ring-primary/20"
                    required
                  />
                </div>
              )}

              {authError && (
                <p className="text-destructive text-xs font-medium bg-destructive/10 p-3 rounded-xl">
                  {authError}
                </p>
              )}

              <Button type="submit" disabled={isAuthSubmitting} className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20">
                {isAuthSubmitting ? "Đang xử lý..." : authMode === "login" ? "Đăng nhập" : "Đăng ký"}
              </Button>
              {authMode === "login" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full text-right text-xs font-medium text-primary hover:underline"
                >
                  Quên mật khẩu?
                </button>
              )}
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-secondary dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-950 px-4 text-muted-foreground font-bold tracking-widest">Hoặc</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isAuthSubmitting}
              className="w-full h-12 rounded-xl border-secondary dark:border-zinc-800 hover:bg-secondary/10 flex items-center justify-center gap-3 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Tiếp tục với Google
            </Button>

            <p className="text-center mt-8 text-sm text-muted-foreground">
              {authMode === "login" ? (
                <>
                  Chưa có tài khoản?{" "}
                  <button
                    onClick={() => { setAuthMode("register"); setAuthError(""); }}
                    className="text-primary font-bold hover:underline"
                  >
                    Đăng ký ngay
                  </button>
                </>
              ) : (
                <>
                  Đã có tài khoản?{" "}
                  <button
                    onClick={() => { setAuthMode("login"); setAuthError(""); }}
                    className="text-primary font-bold hover:underline"
                  >
                    Đăng nhập
                  </button>
                </>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
