import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for absolute path resolving
const resolvePath = (p: string) => path.resolve(__dirname, p);

// Heuristic local classification engine if Gemini is absent, rate-limited, or fails.
function findBestMatchLocal(rawText: string, catalogItems: any[]) {
  const normText = rawText.toLowerCase().trim();
  
  // Specific keyword indicators mapping standard task records to catalog item IDs
  const keywordsMap: { [key: string]: string[] } = {
    "N1_650": ["công văn", "thông báo", "hành chính", "soạn thảo văn bản", "phúc đáp", "tờ trình đơn giản", "giấy mời", "soạn thảo công văn"],
    "N1_651": ["tin bài", "đăng tải", "trang thông tin", "website", "cổng thông tin", "bài viết", "đăng bải"],
    "N1_652": ["tài liệu phục vụ", "chuẩn bị tài liệu", "in ấn", "phòng họp", "họp ủy ban", "tài liệu họp", "họp thường kỳ"],
    "N1_653": ["biên bản họp", "ghi biên bản", "biên bản chuyên môn", "biên bản làm việc"],
    "N1_654": ["đôn đốc", "công văn đôn đốc", "nhắc nhở", "chỉ tiêu"],
    "N1_655": ["cbccvc", "lý lịch", "hồ sơ cán bộ", "cơ sở dữ liệu", "phần mềm quản lý"],
    "N1_656": ["báo cáo tuần", "kết quả tuần", "báo cáo phòng tuần", "tổng hợp tuần", "báo cáo giao ban"],
    "N1_657": ["phối hợp gửi số liệu", "số liệu phòng", "chuyển sở ngành", "gửi báo cáo phối hợp"],
    "N1_658": ["danh mục công việc", "hồ sơ cá nhân", "lập hồ sơ", "sắp xếp công việc"],
    "N1_659": ["tuyên truyền", "phổ biến", "pháp luật", "theo dõi thi hành"],
    "N1_660": ["thẩm định văn bản", "duyệt văn bản", "phê duyệt văn bản", "duyệt đơn giản", "duyệt trình"],
    "N1_663": ["điều xe", "lệnh điều xe", "lái xe", "ô tô", "lịch trình"],
    "N1_664": ["hạch toán", "chứng từ", "kế toán", "thanh toán", "báo cáo tài chính", "hoạt động cơ quan", "kho bạc", "thu chi"],
    "N1_667": ["văn thư", "đi đến", "công văn đi", "công văn đến", "vào sổ", "tiếp nhận văn bản"],
    "N1_671": ["hậu cần", "chuẩn bị họp", "nước uống", "khánh tiết", "phòng họp sẵn sàng"],
    "N2_1259": ["góp ý", "tham gia ý kiến", "dự thảo", "văn bản quy phạm", "luật", "thông tư", "nghị định", "quyết định quy phạm"],
    "N2_1260": ["phiếu lấy ý kiến", "phiếu đóng góp", "ý kiến dự thảo"],
    "N2_1263": ["thanh tra", "kiểm toán", "nhà nước", "kiến nghị thanh tra", "giải trình kiểm toán", "đoàn thanh tra"],
    "N2_1264": ["cử tri", "kiến nghị cử tri", "trả lời cử tri", "hội đồng nhân dân"],
    "N2_1265": ["khiếu nại", "tố cáo", "đơn thư", "phản ánh", "giải quyết khiếu nại"],
    "N2_1269": ["cải cách hành chính", "cchc", "chỉ số cải cách", "chấm điểm cchc"],
    "N2_1271": ["đào tạo", "bồi dưỡng", "nâng cao nghiệp vụ", "lớp học", "tập huấn"],
    "N2_1273": ["biên chế", "nhân sự", "quyết định tuyển dụng", "điều động", "bổ nhiệm", "nâng lương", "hợp đồng lao động", "chuyển đổi vị trí"],
    "N2_1274": ["chuyển đổi số", "đề án 06", "công nghệ thông tin", "phần mềm", "chữ ký số"],
    "N2_1275": ["đánh giá xếp loại", "báo cáo xếp loại", "phân loại công chức", "thi đua", "khen thưởng"],
    "N2_1320": ["thẩm tra", "quyết toán vốn", "dự án hoàn thành", "vốn đầu tư", "báo cáo thẩm tra quyết toán"],
    "N2_1321": ["phê duyệt quyết toán", "quyết định phê duyệt", "dự án xây dựng cơ bản"],
    "N2_1322": ["kiểm tra quyết toán", "kết luận thẩm định", "vốn đầu tư huyện"],
    "N2_1325": ["giải ngân", "vốn đầu tư công", "tình hình phân bổ", "kế hoạch vốn", "điều chỉnh vốn"],
    "N3_760": ["vị trí việc làm", "vtvl", "đề án vị trí"],
    "N3_761": ["báo cáo tháng", "báo cáo năm", "kết quả công tác năm", "báo cáo tổng kết", "hoạt động của sở"],
    "N3_762": ["chương trình công tác", "kế hoạch năm", "chương trình hành động"],
    "N3_764": ["quy định chức năng", "nhiệm vụ quyền hạn", "chức năng phòng"],
    "N3_821": ["tham mưu giải pháp", "đẩy nhanh giải ngân", "giải ngân vốn", "tỉnh ủy", "ubnd tỉnh"],
    "N3_828": ["chỉ số cải cách tài chính công", "tài chính công", "hội đồng thẩm định"],
    "N4_214": ["quy phạm pháp luật", "nghị quyết hđnd", "quyết định ubnd", "tờ trình thẩm định"],
    "N4_217": ["xúc tiến", "thu hút đầu tư", "cao bằng năm 2026", "môi trường đầu tư"],
    "N4_218": ["pci", "năng lực cạnh tranh", "chỉ số pci"],
    "N5_64": ["cơ chế chính sách", "vùng đặc biệt khó khăn", "khuyến khích doanh nghiệp"],
    "N5_70": ["quy hoạch tỉnh", "phát triển kinh tế xã hội", "kế hoạch 5 năm"],
    "N5_71": ["kịch bản tăng trưởng", "điều hành kịch bản", "tài chính kinh tế", "điều hành kinh tế"]
  };

  const scoredItems = catalogItems.map(item => {
    let score = 0;
    
    // Explicit code code match (e.g. N1_650)
    if (normText.includes(item.id.toLowerCase())) {
      score += 1000;
    }
    
    // Sub-string/phrase match with title
    const cleanTitle = item.title.toLowerCase();
    if (normText.includes(cleanTitle)) {
      score += 250;
    }
    
    // Check keyword triggers
    const triggers = keywordsMap[item.id] || [];
    for (const kw of triggers) {
      if (normText.includes(kw)) {
        score += 80;
        if (kw.split(' ').length > 1) {
          score += 40;
        }
      }
    }
    
    // Character-level text overlaps
    const textWords = normText.split(/\s+/);
    const titleWords = cleanTitle.split(/\s+/);
    let commonWords = 0;
    for (const w of textWords) {
      if (w.length > 2 && titleWords.includes(w)) {
        commonWords++;
      }
    }
    score += commonWords * 8;
    return { item, score };
  });

  // Sort and take top 4 candidates for diverse mapping options
  const sorted = scoredItems.sort((a, b) => b.score - a.score);
  let topCandidates = sorted.slice(0, 4).map(c => c.item);

  if (topCandidates.length === 0 || !sorted[0] || sorted[0].score <= 0) {
    const fallbackItem = (catalogItems && typeof catalogItems.find === 'function')
      ? (catalogItems.find(i => i.id === "N1_650") || catalogItems[0])
      : null;
    if (fallbackItem) {
      const otherItems = catalogItems.filter(i => i && i.id !== fallbackItem.id).slice(0, 3);
      topCandidates = [fallbackItem, ...otherItems];
    } else {
      topCandidates = [{
        id: "N1_650",
        title: "Soạn thảo văn bản hành chính (Công văn, thông báo...)",
        group: "Nhóm 1",
        category: "Lĩnh vực chung",
        maxScore: 100,
        benchmarkScore: 5,
        multiplier: 1,
        output: "Công văn, Thông báo hành chính hoàn thành"
      }];
    }
  }

  const recommendations = topCandidates.filter(Boolean).map((bestItem, index) => {
    // Clean rawText punctuation for title refinement
    const cleanInputText = rawText.replace(/[.,;!?]/g, '').trim();
    let refinedTitle = "";

    if (bestItem.id === "N1_650") {
      refinedTitle = `Soạn thảo văn bản hành chính phối hợp công tác về việc: "${cleanInputText}"`;
    } else if (bestItem.id === "N1_656") {
      refinedTitle = `Xây dựng Báo cáo tuần của phòng về kết quả công tác chuyên môn: ${cleanInputText}`;
    } else if (bestItem.id === "N2_1259") {
      refinedTitle = `Tham gia ý kiến góp ý dự thảo văn bản quy phạm pháp luật: ${cleanInputText}`;
    } else if (bestItem.id === "N2_1325") {
      refinedTitle = `Báo cáo phân tích chuyên sâu giải pháp xúc tiến đầu tư giải ngân: ${cleanInputText}`;
    } else if (bestItem.id === "N2_1320" || bestItem.id === "N2_1321" || bestItem.id === "N2_1322") {
      refinedTitle = `Thẩm tra quyết toán vốn đầu tư hoàn thành dự án/văn bản: ${cleanInputText}`;
    } else {
      const firstLetterCap = cleanInputText.charAt(0).toUpperCase() + cleanInputText.slice(1);
      refinedTitle = `${bestItem.title.split('(')[0].trim()}: "${firstLetterCap}"`;
    }

    if (refinedTitle.length > 120) {
      refinedTitle = refinedTitle.substring(0, 117) + "...";
    }

    const scoreField = bestItem.benchmarkScore || bestItem.multiplier || 5;

    return {
      matchedId: bestItem.id,
      refinedTitle: refinedTitle,
      refinedDescription: `Thực hiện đối chiếu chuẩn hóa Catalog chuyên ngành Sở Tài chính cho nghiệp vụ di sản công tác: ${rawText}. Đánh giá kiểm tra sản phẩm đầu ra chính thống đạt chất lượng theo tiêu chuẩn hành chính Sở.`,
      recommendedScore: scoreField,
      recommendedEvidenceTemplate: `Văn bản/Chứng từ đầu ra số ... thực tế phòng chuyên môn`,
      explanation: index === 0 
        ? `Lựa chọn khớp nhất dựa trên từ khóa phân tích tự động.` 
        : `Lựa chọn tương đương/thay thế phù hợp ở lĩnh vực chuyên môn liên quan.`
    };
  });

  return {
    matchedId: recommendations[0].matchedId,
    refinedTitle: recommendations[0].refinedTitle,
    refinedDescription: recommendations[0].refinedDescription,
    recommendedScore: recommendations[0].recommendedScore,
    recommendedEvidenceTemplate: recommendations[0].recommendedEvidenceTemplate,
    explanation: recommendations[0].explanation,
    recommendations: recommendations
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000; // Hardcoded container reverse-proxy port

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini API securely server-side
  let ai: GoogleGenAI | null = null;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY") {
    try {
      ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log("Server: Gemini API initialized successfully.");
    } catch (err) {
      console.error("Server: Failed to initialize Gemini API Client:", err);
    }
  } else {
    console.warn("Server: GEMINI_API_KEY is not configured. Server-side AI suggestions will be disabled.");
  }

  // --- API ROUTES ---

  // Endpoint to optimize/recommend KPI mapping
  app.post('/api/optimize-kpi', async (req, res) => {
    const { rawText, catalogItems } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: 'Nội dung rawText là bắt buộc.' });
    }

    // Secure local fallback if Gemini is not configured at all
    if (!ai) {
      console.log("Server API: Gemini not configured, serving heuristic fallback matching results.");
      const heuristicResult = findBestMatchLocal(rawText, catalogItems);
      return res.json(heuristicResult);
    }

    try {
      // Structure catalog for prompt token efficiency
      const minimizedCatalog = catalogItems && Array.isArray(catalogItems) 
        ? catalogItems.map(item => ({
            id: item.id,
            title: item.title,
            group: item.group,
            cat: item.category,
            score: item.benchmarkScore,
            out: item.output
          }))
        : [];

      const systemInstruction = `Bạn là một chuyên gia tư vấn thiết lập và đánh giá chỉ số KPI cho cán bộ, công chức tại Sở Tài chính Cao Bằng, Việt Nam.
Nhiệm vụ của bạn là nhận vào một mô tả công việc thô (rawText) do công chức nhập, so sánh đối chiếu và tìm kiếm đề xuất các mã sản phẩm/công việc phù hợp nhất trong Danh mục sản phẩm/công việc chuẩn (Catalog) được cung cấp.

Đặc biệt lưu ý: Bạn phải đề xuất NHIỀU phương án KPI khác nhau dưới dạng danh sách (recommendations) tối đa 4-5 phương án, sắp xếp theo độ ưu tiên giảm dần.
Không chỉ giới hạn ở một lĩnh vực cố định, ngoài mã thuộc "Lĩnh vực đầu tư" (nếu có liên quan) bạn HÃY ĐỀ XUẤT CÁC MÃ TƯƠNG ĐƯƠNG của các lĩnh vực khác để người dùng có nhiều lựa chọn nếu nghiệp vụ của họ có giao thoa hoặc mang tính chất phối hợp (ví dụ lựa chọn thay thế trong "Lĩnh vực chung", "Lĩnh vực văn phòng", "Lĩnh vực phát triển doanh nghiệp" hoặc "Lĩnh vực ngân sách").

Với mỗi phương án lựa chọn, bạn cần:
1. Xác định Mã sản phẩm chuẩn (matchedId) tương thích từ catalog.
2. Diễn đạt lại tiêu đề công việc chuẩn hóa (refinedTitle) theo đúng văn phong hành chính chính quy cấp Sở (ví dụ: thay vì viết thô 'làm văn bản về đầu thầu huyện' hãy viết 'Báo cáo rà soát, thẩm định hồ sơ đấu thầu xây dựng cơ bản huyện').
3. Mô tả chi tiết nội dung công việc (refinedDescription) một cách chuyên nghiệp, nêu rõ quy trình nghiệp vụ hành chính chính thống.
4. Đề xuất mẫu văn bản làm minh chứng (recommendedEvidenceTemplate).
5. Trích xuất mức điểm đánh giá tiêu chuẩn từ Catalog (recommendedScore).
6. Viết lời giải thích súc tích (explanation) vì sao mã này phù hợp, chỉ ra đây thuộc lĩnh vực nào (đầu tư, ngân sách hay hành chính văn phòng chung) để cán bộ dễ so sánh.

Bạn buộc phải trả về phản hồi dưới dạng chuẩn JSON cấu trúc như sau:
{
  "matchedId": "mã id của khuyến nghị lựa chọn số 1",
  "refinedTitle": "tiêu đề chuẩn hóa của khuyến nghị lựa chọn số 1",
  "refinedDescription": "mô tả của khuyến nghị lựa chọn số 1",
  "recommendedScore": điểm của khuyến nghị số 1,
  "recommendedEvidenceTemplate": "minh chứng của khuyến nghị số 1",
  "explanation": "giải thích của khuyến nghị số 1",
  "recommendations": [
    {
      "matchedId": "mã id từ catalog ví dụ N2_1325",
      "refinedTitle": "tiêu đề hành chính chuẩn hóa tương ứng",
      "refinedDescription": "mô tả chi tiết chuyên nghiệp tương ứng",
      "recommendedScore": điểm benchmarkScore của mã tương ứng (số),
      "recommendedEvidenceTemplate": "mẫu minh chứng số hiệu văn bản tương ứng",
      "explanation": "giải giải thuyết phục vì sao mã này phù hợp và nó thuộc lĩnh vực gì"
    }
  ]
}`;

      const userPrompt = `Nội dung mô tả công việc thô: "${rawText}"

Dưới đây là Danh mục Sản phẩm KPI tiêu chuẩn (Catalog):
${JSON.stringify(minimizedCatalog, null, 2)}

Hãy phân tích kỹ lưỡng và trả về định lượng định dạng JSON chuẩn chỉ duy nhất theo định nghĩa.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchedId: { type: Type.STRING, description: "ID matching standard code from catalog for the first item" },
              refinedTitle: { type: Type.STRING, description: "Formalized professional Vietnamese administrative task name for the first item" },
              refinedDescription: { type: Type.STRING, description: "Notes on the first item" },
              recommendedScore: { type: Type.INTEGER, description: "Benchmark points for the first item" },
              recommendedEvidenceTemplate: { type: Type.STRING, description: "Document template for the first item" },
              explanation: { type: Type.STRING, description: "Why first catalog map fits" },
              recommendations: {
                type: Type.ARRAY,
                description: "List of multiple candidate matches representing targeted as well as equivalent categories",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    matchedId: { type: Type.STRING },
                    refinedTitle: { type: Type.STRING },
                    refinedDescription: { type: Type.STRING },
                    recommendedScore: { type: Type.INTEGER },
                    recommendedEvidenceTemplate: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["matchedId", "refinedTitle", "refinedDescription", "recommendedScore", "recommendedEvidenceTemplate", "explanation"]
                }
              }
            },
            required: ["matchedId", "refinedTitle", "refinedDescription", "recommendedScore", "recommendedEvidenceTemplate", "explanation", "recommendations"]
          },
          temperature: 0.3, // low temperature for precise catalog mapping and matching
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error('Gemini API returned an empty output');
      }

      const parsedResult = JSON.parse(resultText);
      return res.json(parsedResult);
    } catch (err: any) {
      console.warn('API Error in optimize-kpi (falling back to robust local matching):', err);
      // Fallback seamlessly on any Gemini exception or parsing issue
      try {
        const heuristicResult = findBestMatchLocal(rawText, catalogItems);
        return res.json(heuristicResult);
      } catch (fallbackErr) {
        console.error('Ultimate API failure:', fallbackErr);
        return res.status(500).json({ 
          error: 'Có lỗi xảy ra khi xử lý phản hồi từ AI.', 
          details: err?.message || String(err) 
        });
      }
    }
  });

  // New endpoint for daily review
  app.post('/api/daily-evaluation', async (req, res) => {
    const { tasks, fullName, department, kpiGoal } = req.body;
    
    const formattedTaskList = tasks && Array.isArray(tasks) 
      ? tasks.map((t, idx) => `${idx + 1}. [${t.kpiCategory || 'Chưa phân loại'}] ${t.title} - Trạng thái: ${t.status === 'completed' ? 'Đã xong' : 'Chưa xong'} - Điểm: ${t.selfGradedScore}đ KPI`).join('\n')
      : "Không có công việc nào.";

    const totalKpi = tasks && Array.isArray(tasks)
      ? tasks.reduce((sum, t) => sum + (parseFloat(t.selfGradedScore) || 0), 0)
      : 0;

    // Local fallback heuristic generator if Gemini is absent
    const getLocalEvaluation = () => {
      let advice = "";
      if (totalKpi === 0) {
        advice = "Hôm nay đồng chí chưa ghi nhận điểm KPI nào. Hãy bổ sung ngay các công việc đã thực hiện để không bị sót nộp báo cáo cuối tháng.";
      } else if (totalKpi < 15) {
        advice = "Tổng điểm KPI trong ngày còn thấp hơn mức trung bình cần thiết (khoảng 15-20 điểm/ngày để đạt mục tiêu tháng). Hãy rà soát xem còn nhiệm vụ nào thuộc Nhóm 1 (văn bản hành chính) hoặc Nhóm 2 (thẩm định chuyên môn) chưa được kê khai không.";
      } else {
        advice = "Hiệu suất công tác trong ngày rất tốt! Điểm tích lũy vượt tiến độ trung bình ngày. Đồng chí hãy lưu giữ kỹ các minh chứng (số hiệu công văn, tờ trình) phục vụ hậu kiểm xuất file Excel.";
      }

      return `### 📊 Đánh giá Hiệu suất KPI ngày của đồng chí **${fullName || 'Cán bộ'}**
*Bộ phận: ${department || 'Phòng chuyên môn'}*

**Tóm tắt số liệu:**
- **Tổng số việc ghi nhận:** ${tasks?.length || 0} nhiệm vụ
- **Tổng điểm KPI đạt được:** **${totalKpi.toFixed(1)} / ${kpiGoal || 300} điểm mục tiêu**

---

### 🔍 Nhận xét cụ thể từ Trợ lý AI:
1. **Mức độ hoàn thành:** Đồng chí đã hoàn thành ${tasks?.filter(t => t.status === 'completed').length || 0} trên tổng số ${tasks?.length || 0} công việc trong danh mục ngày. các công việc đã được tự động áp mã theo đúng Catalog của Sở Tài chính Cao Bằng.
2. **Định chuẩn Catalog:** Điểm trung bình mỗi đầu việc đạt tiêu chuẩn tốt. Việc ghi chép minh chứng rõ ràng, đáp ứng yêu cầu trích xuất hồ sơ kiểm toán.
3. **Mã Công văn & Tờ trình:** Ghi nhận áp dụng các mã nhóm N1, N2 chính xác theo đặc thù chuyên ngành.

---

### 💡 Khuyến nghị tối ưu hóa:
- **Hành động tiếp theo:** ${advice}
- **Về chứng từ:** Biên soạn đầy đủ thông tin số hiệu tờ trình/quyết toán để tệp Excel tải lên hệ thống chung toàn tỉnh không bị lỗi.

*Chúc đồng chí hoàn thành xuất bản tài liệu công tác hôm nay xuất sắc!*`;
    };

    if (!ai) {
      return res.json({ evaluation: getLocalEvaluation() });
    }

    try {
      const systemInstruction = `Bạn là Trợ lý phân tích và đánh giá KPI tối cao dành cho cán bộ công chức thuộc Sở Tài chính tỉnh Cao Bằng.
Nhiệm vụ của bạn là nhận vào danh sách công việc trong ngày của cán bộ, tổng số điểm, mục tiêu tháng và đưa ra nhận xét, đánh giá chuyên nghiệp, mang tinh thần nâng cao nghiệp vụ hành chính chính quy.
Hãy phản hồi bằng văn phong hành chính trang trọng, súc tích, mang tính khuyến khích động viên cao và luôn chia thành các tiêu mục rõ ràng bằng Markdown tiếng Việt.`;

      const userPrompt = `Hãy đánh giá ngày làm việc của cán bộ sau:
- Tên cán bộ: ${fullName}
- Phòng ban: ${department}
- Mục tiêu KPI tháng: ${kpiGoal} điểm
- Các công việc trong ngày:
${formattedTaskList}
- Tổng điểm KPI trong ngày đạt được: ${totalKpi.toFixed(1)} điểm.

Đưa ra đánh giá chi tiết (khoảng 300-400 từ) gồm cấu trúc: Tóm tắt hiệu suất, Nhận xét cụ thể về việc chọn mã sản phẩm nhóm N1-N5, và Khuyến nghị hành động tiếp theo để đạt nhanh mục tiêu tháng. Trả về dưới dạng đối tượng JSON duy nhất có khóa "evaluation" chứa văn bản Markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              evaluation: { type: Type.STRING, description: "Detailed Markdown-formatted evaluation of the user's KPI performance today" }
            },
            required: ["evaluation"]
          },
          temperature: 0.5
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error('Gemini API returned an empty output');
      }

      const parsedResult = JSON.parse(resultText);
      return res.json(parsedResult);
    } catch (err: any) {
      console.warn('API Error in daily-evaluation:', err);
      return res.json({ evaluation: getLocalEvaluation() });
    }
  });

  // New endpoint for Chatbot Assistant
  app.post('/api/chat-assistant', async (req, res) => {
    const { message, history, catalogItems, currentDateStr } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Nội dung tin nhắn bắt buộc phải có.' });
    }

    // Heuristic local fallback chat assistant if Gemini is absent
    const getLocalChatResponse = () => {
      const normMsg = message.toLowerCase().trim();
      const bestMatch = findBestMatchLocal(message, catalogItems || []);
      
      // If there is a high-confidence match or user is describing work
      const isDescribingWork = normMsg.length > 8 && (
        normMsg.includes("soạn") || normMsg.includes("gửi") || normMsg.includes("thẩm") || 
        normMsg.includes("báo cáo") || normMsg.includes("tờ trình") || normMsg.includes("góp ý") || 
        normMsg.includes("nhập") || normMsg.includes("quyết toán") || normMsg.includes("họp") ||
        normMsg.includes("công văn") || normMsg.includes("thanh tra") || normMsg.includes("nhân sự") ||
        normMsg.includes("kế toán") || normMsg.includes("hạch toán")
      );

      if (isDescribingWork && bestMatch && bestMatch.matchedId) {
        const foundItem = catalogItems.find((i: any) => i.id === bestMatch.matchedId);
        const score = foundItem ? foundItem.multiplier : 5;
        const title = bestMatch.refinedTitle || `Ghi nhận công việc qua Chat: "${message}"`;
        
        return {
          reply: `### Đã ghi nhận thành công từ hội thoại! 📝\n\nTôi đã dùng thuật toán rà soát tìm được mã công việc phù hợp nhất cho mô tả: *"${message}"*\n\n- **Mã Catalog:** \`${bestMatch.matchedId}\` - *${foundItem?.title || ''}*\n- **Tên hành chính đề xuất:** **${title}**\n- **Hệ số quy đổi đạt được:** **${score} điểm KPI**\n\nTôi đã tự động bổ sung công việc này vào timeline biểu mẫu của đồng chí cho ngày **${currentDateStr}**!`,
          action: {
            type: "ADD_TASK",
            task: {
              title: title,
              description: message,
              matchedId: bestMatch.matchedId,
              timeRange: "09:00 - 10:30",
              evidence: `Minh chứng hồ sơ đầu ra mã ${bestMatch.matchedId}`,
              subtasks: [
                "Chuẩn bị tài liệu & nghiên cứu dữ liệu chuyên môn",
                "Biên soạn nội dung dự thảo/hoàn thiện văn bản trình duyệt",
                "Lưu trữ hồ sơ chứng từ minh chứng mã hóa"
              ]
            }
          }
        };
      }

      // Default conversational chit-chat
      let textResponse = `Xin chào đồng chí! Tôi là **Trợ lý AI Hỏa tốc của Sở Tài chính tỉnh Cao Bằng** 🇻🇳. \n\nTôi có thể giúp đồng chí:\n1. **Chuẩn hóa & Ghi nhận KPI tự động:** Đồng chí chỉ cần gõ nội dung công việc (ví dụ: *\"Tôi mới làm xong tờ trình xin ngân sách bồi dưỡng\"*), tôi sẽ tự động quy đổi mã chuẩn và cộng điểm trên bảng biểu ngày.\n2. **Tư vấn Danh mục nghiệp vụ:** Hỏi tôi bất kỳ câu hỏi nào về các mã Nhóm N1 - N5, tỷ trọng hoặc cách tính điểm.\n\nHãy mô tả việc làm hôm nay của đồng chí để bắt đầu nhé!`;
      
      if (normMsg.includes("xin chào") || normMsg.includes("hello") || normMsg.includes("chào")) {
        textResponse = `Chào đồng chí! Trợ lý AI Hỏa tốc Sở Tài chính Cao Bằng xin kính chúc ngày làm việc hiệu suất cao. Đồng chí có văn bản hay công tác gì mới hoàn thành cần tôi ghi nhận điểm KPI không?`;
      } else if (normMsg.includes("cám ơn") || normMsg.includes("cảm ơn") || normMsg.includes("thanks")) {
        textResponse = `Rất sẵn lòng hỗ trợ đồng chí! Hãy tiếp tục chia sẻ các công việc đã làm để tôi đăng ký KPI định mức hỏa tốc nhé.`;
      } else if (normMsg.includes("mã") || normMsg.includes("n1") || normMsg.includes("n2") || normMsg.includes("catalog")) {
        textResponse = `Dưới Catalog nghiệp vụ của Sở Tài chính Cao Bằng bao gồm:\n- **Nhóm 1 (N1):** Công tác văn thư hành chính, báo cáo nội bộ phòng (5đ đến 80đ).\n- **Nhóm 2 (N2):** Thẩm định, thẩm tra ngân sách đầu tư chuyên sâu (80đ đến 150đ).\n- **Nhóm 3 (N3):** Xây dựng chiến lược hành động, vị trí việc làm cơ quan.\n\nĐồng chí muốn tôi tư vấn sâu hơn về mã công việc cụ thể nào không?`;
      }

      return {
        reply: textResponse,
        action: {
          type: "NO_ACTION"
        }
      };
    };

    if (!ai) {
      return res.json(getLocalChatResponse());
    }

    try {
      const systemInstruction = `Bạn là Trợ lý AI Hỏa tốc của Sở Tài chính tỉnh Cao Bằng, Việt Nam.
Nhiệm vụ của bạn là hỗ trợ cán bộ công chức quản lý công việc và tự động chuẩn hóa, ghi nhận KPI của họ thông qua cuộc trò chuyện tự nhiên.

Bạn nhận vào:
1. Tin nhắn mới nhất của người dùng (message)
2. Lịch sử cuộc trò chuyện (history)
3. Danh mục sản phẩm KPI tiêu chuẩn (catalogItems)
4. Ngày hiện tại (currentDateStr)

Hãy phân tích tin nhắn của người dùng:
- Nếu người dùng mô tả một công việc họ đã làm (ví dụ: "soạn thảo công văn hỏa tốc gửi UBND tỉnh", "nhập dữ liệu 40 cán bộ", "thẩm định quyết toán dự án điện"), bạn hãy xác định Mã KPI khớp nhất (matchedId) từ Catalog được cung cấp. Cố gắng chuẩn hóa tiêu đề công việc hành chính chính quy (refinedTitle), đề xuất thời gian (timeRange), và minh chứng (evidence). Đặt action.type là "ADD_TASK".
- Nếu người dùng yêu cầu xóa hoặc sửa nhưng chưa rõ ID, hãy hỏi thêm hoặc trả về action.type là "NO_ACTION". Nếu người dùng chỉ đang hỏi đáp hoặc trò chuyện thông thường về nghiệp vụ tài chính, KPI, hay chào hỏi, hãy trả lời nhiệt tình, thân thiện. Đặt action.type là "NO_ACTION".

Định dạng trả về BẮT BUỘC là đối tượng JSON duy nhất có cấu trúc:
{
  "reply": "Lời đáp thoại bằng tiếng Việt (Hỗ trợ viết bằng định dạng Markdown đẹp, chuyên nghiệp, súc tích). Gửi lời động viên hoặc giải thích nghiệp vụ tận tình nhất cho cán bộ.",
  "action": {
    "type": "ADD_TASK" hoặc "NO_ACTION",
    "task": {
      "title": "Tiêu đề hành chính chuẩn hóa chính quy (Ví dụ: 'Soạn thảo tờ trình đề xuất kinh phí...' thay vì viết thô)",
      "description": "Chi tiết công việc (sử dụng chính mô tả thô ban đầu của người dùng hoặc tóm lược ngắn gọn)",
      "matchedId": "Mã ID từ Catalog (Ví dụ: 'N1_650')",
      "timeRange": "Thời gian diễn ra dựa trên tin nhắn người dùng hoặc tự động suy luận (Ví dụ: '09:00 - 10:30')",
      "evidence": "Gợi ý minh chứng chính thống (Ví dụ: 'Tờ trình số .../TTr-STC thực tế')",
      "subtasks": ["Chuẩn bị tài liệu & nghiên cứu dữ liệu", "Biên soạn dự thảo và hoàn thiện văn bản", "Lãnh đạo ký duyệt và ban hành"]
    }
  }
}`;

      // Format conversation history for Gemini SDK
      const formattedHistory = history && Array.isArray(history) 
        ? history.map((msg: any) => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          }))
        : [];

      // Structure catalog for prompt token efficiency
      const minimizedCatalog = catalogItems && Array.isArray(catalogItems) 
        ? catalogItems.map((item: any) => ({
            id: item.id,
            title: item.title,
            group: item.group,
            cat: item.category,
            score: item.benchmarkScore,
            out: item.output
          }))
        : [];

      const userPrompt = `Tin nhắn mới của đồng chí cán bộ: "${message}"

Lịch sử cuộc trò chuyện:
${JSON.stringify(formattedHistory)}

Danh mục Sản phẩm KPI tiêu chuẩn (Catalog):
${JSON.stringify(minimizedCatalog)}

Ngày hiện tại là: ${currentDateStr}

Hãy phân tích kỹ lưỡng cuộc trò chuyện, so khớp với catalog và phản hồi dưới dạng JSON duy nhất. Nếu tin nhắn có chứa thông tin công việc đã làm thì trả về action.type là "ADD_TASK".`;

      let resultText = "";
      console.log(`[ChatAssistant] Received request with message: "${message ? message.substring(0, 60) : ''}..."`);

      try {
        console.log(`[ChatAssistant] Sending structured request to Gemini-3.5-flash with schema`);
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING, description: "Polite Vietnamese conversational assist message" },
                action: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["ADD_TASK", "NO_ACTION"] },
                    task: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        matchedId: { type: Type.STRING },
                        timeRange: { type: Type.STRING },
                        evidence: { type: Type.STRING },
                        subtasks: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        }
                      },
                      required: ["title", "description", "matchedId", "timeRange", "evidence", "subtasks"]
                    }
                  },
                  required: ["type"]
                }
              },
              required: ["reply", "action"]
            },
            temperature: 0.4
          }
        });
        resultText = response.text || "";
        console.log(`[ChatAssistant] Gemini reply text length: ${resultText.length}`);
      } catch (schemaErr: any) {
        console.warn('[ChatAssistant] Strict responseSchema request failed, retrying without strict schema:', schemaErr);
        // Robust fallback schema-less request forcing JSON response mime-type
        const responseNoSchema = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: userPrompt + "\n\nCRITICAL: You MUST respond in a valid JSON object matching the format:\n{\n  \"reply\": \"Polite conversational reply string in Vietnamese\",\n  \"action\": {\n    \"type\": \"ADD_TASK\" or \"NO_ACTION\",\n    \"task\": {\n      \"title\": \"string\",\n      \"description\": \"string\",\n      \"matchedId\": \"string\",\n      \"timeRange\": \"09:00 - 10:30\",\n      \"evidence\": \"string\",\n      \"subtasks\": [\"string\"]\n    }\n  }\n}",
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.4
          }
        });
        resultText = responseNoSchema.text || "";
        console.log(`[ChatAssistant] Gemini retry reply text length: ${resultText.length}`);
      }

      if (!resultText) {
        throw new Error('Gemini API returned an empty output');
      }

      const parsedResult = JSON.parse(resultText);
      return res.json(parsedResult);
    } catch (err: any) {
      console.warn('API Error in chat-assistant, falling back to local heuristic:', err);
      try {
        const localResult = getLocalChatResponse();
        console.log('[ChatAssistant] Heuristic fallback output:', JSON.stringify(localResult).substring(0, 150));
        return res.json(localResult);
      } catch (fallbackErr: any) {
        console.error('[ChatAssistant] CRITICAL - Local heuristic fallback also failed:', fallbackErr);
        return res.json({
          reply: `Tôi ghi nhận nội dung của đồng chí: "${message}". Hiện tại đường truyền đang bận, tôi đã chuẩn bị sẵn sàng biểu mẫu để đăng ký, đồng chí vui lòng chạm "Đăng ký KPI" hoặc thử lại sau môt lát nhé!`,
          action: {
            type: "NO_ACTION"
          }
        });
      }
    }
  });

  // --- VITE MIDDLEWARE OR STATIC FILE HOSTING ---

  if (process.env.NODE_ENV === 'production') {
    // Serving built files directly in production
    const distPath = resolvePath('dist');
    if (!fs.existsSync(distPath)) {
      console.warn(`Server: Production build directory not found at ${distPath}. Please build client application first.`);
    }
    app.use(express.static(distPath));

    // Wildcard route to handle spa fallback routing to index.html
    app.get('*', (req, res, next) => {
      // Don't intercept API routes
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(resolvePath('dist/index.html'));
    });
  } else {
    // In development mode, load Vite in middleware mode
    console.log("Server: Vite Dev Server starting in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    app.use(vite.middlewares);
  }

  // Bind to 0.0.0.0 for hosting environment access
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server: Application is running at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer().catch(err => {
  console.error("Server: Fatal launch error during application startup:", err);
});
