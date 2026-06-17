export interface StandardTaskCatalogItem {
  id: string; // e.g. N1_650
  title: string; // Name of product
  group: string; // e.g. "Nhóm 1", "Nhóm 2", etc.
  category: string; // e.g. "Lĩnh vực chung", "Lĩnh vực văn phòng", "Lĩnh vực đầu tư", etc.
  maxScore: number; // e.g. 100, 200, 300
  benchmarkScore: number; // e.g. 5, 50, 80 (Điểm chấm)
  multiplier: number; // e.g. 1, 10, 16 (Hệ số quy đổi)
  output: string; // Standard output product desc
}

export const CATALOG_CATEGORIES = [
  "Lĩnh vực chung",
  "Lĩnh vực văn phòng",
  "Lĩnh vực đầu tư",
  "Lĩnh vực ngân sách",
  "Lĩnh vực Quản lý giá Công sản",
  "Lĩnh vực phát triển doanh nghiệp"
];

export const STANDARD_TASK_CATALOG: StandardTaskCatalogItem[] = [
  // --- NHÓM 1 ---
  {
    id: "N1_650",
    title: "Soạn thảo văn bản hành chính (Công văn, thông báo...)",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 5,
    multiplier: 1,
    output: "Công văn, Thông báo hành chính hoàn thành"
  },
  {
    id: "N1_651",
    title: "Đăng tải tin bài trên Trang thông tin điện tử của Sở Tài chính",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 50,
    multiplier: 10,
    output: "Tin bài được xuất bản"
  },
  {
    id: "N1_652",
    title: "Chuẩn bị tài liệu phục vụ các cuộc họp thường kỳ của UBND tỉnh, Tỉnh ủy...",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 80,
    multiplier: 16,
    output: "Tài liệu/báo cáo in ấn và hoàn thiện phục vụ họp"
  },
  {
    id: "N1_653",
    title: "Soạn thảo biên bản họp chuyên môn",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 80,
    multiplier: 16,
    output: "Biên bản họp có chữ ký các bên"
  },
  {
    id: "N1_654",
    title: "Công văn đôn đốc thực hiện nhiệm vụ, chỉ tiêu được giao",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 80,
    multiplier: 16,
    output: "Công văn đôn đốc ban hành"
  },
  {
    id: "N1_655",
    title: "Quản lý, cập nhật cơ sở dữ liệu CBCCVC (dữ liệu cán bộ cá nhân)",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 50,
    multiplier: 10,
    output: "Dữ liệu được cập nhật trên phần mềm hệ thống"
  },
  {
    id: "N1_656",
    title: "Báo cáo kết quả công tác hằng tuần của phòng chuyên môn",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 70,
    multiplier: 14,
    output: "Báo cáo tuần hoàn thành gửi lãnh đạo"
  },
  {
    id: "N1_657",
    title: "Phối hợp gửi số liệu, báo cáo thuộc lĩnh vực của phòng cho sở ngành",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 70,
    multiplier: 14,
    output: "Số liệu/báo cáo được tổng hợp chuyển đi"
  },
  {
    id: "N1_658",
    title: "Lập, cập nhật hồ sơ danh mục công việc cá nhân hằng tuần",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 50,
    multiplier: 10,
    output: "Danh mục hồ sơ công việc được lưu trữ"
  },
  {
    id: "N1_659",
    title: "Tuyên truyền phổ biến và theo dõi thi hành pháp luật thuộc lĩnh vực chuyên môn",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 80,
    multiplier: 16,
    output: "Báo cáo hoặc Công văn phổ biến được ban hành"
  },
  {
    id: "N1_660",
    title: "Thẩm định, duyệt văn bản đơn giản của chuyên viên gửi trình",
    group: "Nhóm 1",
    category: "Lĩnh vực chung",
    maxScore: 100,
    benchmarkScore: 50,
    multiplier: 10,
    output: "Văn bản được duyệt phê hành"
  },
  {
    id: "N1_663",
    title: "Viết lệnh điều xe phục vụ công tác",
    group: "Nhóm 1",
    category: "Lĩnh vực văn phòng",
    maxScore: 100,
    benchmarkScore: 20,
    multiplier: 4,
    output: "Lệnh điều xe hợp lệ"
  },
  {
    id: "N1_664",
    title: "Hạch toán chứng từ kế toán, kiểm tra chứng từ thanh toán cơ quan",
    group: "Nhóm 1",
    category: "Lĩnh vực văn phòng",
    maxScore: 100,
    benchmarkScore: 50,
    multiplier: 10,
    output: "Bút toán kế toán, bộ chứng từ thanh toán hợp lệ"
  },
  {
    id: "N1_667",
    title: "Thực hiện nghiệp vụ công tác Văn thư (Xử lý công văn đi, đến)",
    group: "Nhóm 1",
    category: "Lĩnh vực văn phòng",
    maxScore: 100,
    benchmarkScore: 10,
    multiplier: 2,
    output: "Sổ công văn đi/đến cập nhật đầy đủ"
  },
  {
    id: "N1_671",
    title: "Hậu cần chuẩn bị các cuộc họp của Sở",
    group: "Nhóm 1",
    category: "Lĩnh vực văn phòng",
    maxScore: 100,
    benchmarkScore: 50,
    multiplier: 10,
    output: "Phòng họp, nước uống, thiết bị sẵn sàng đạt yêu cầu"
  },

  // --- NHÓM 2 ---
  {
    id: "N2_1259",
    title: "Công văn tham gia ý kiến góp ý dự thảo các văn bản quy phạm pháp luật",
    group: "Nhóm 2",
    category: "Lĩnh vực chung",
    maxScore: 200,
    benchmarkScore: 150,
    multiplier: 30,
    output: "Công văn góp ý chính thức được ký duyệt"
  },
  {
    id: "N2_1260",
    title: "Phiếu lấy ý kiến tham gia xây dựng văn bản quy phạm pháp luật",
    group: "Nhóm 2",
    category: "Lĩnh vực chung",
    maxScore: 200,
    benchmarkScore: 150,
    multiplier: 30,
    output: "Phiếu ý kiến hoàn thiện"
  },
  {
    id: "N2_1263",
    title: "Theo dõi, tổng hợp, giải trình kiến nghị cung cấp số liệu cho Thanh tra, Kiểm toán Nhà nước",
    group: "Nhóm 2",
    category: "Lĩnh vực chung",
    maxScore: 200,
    benchmarkScore: 150,
    multiplier: 30,
    output: "Báo cáo, biểu mẫu giải trình chuẩn xác"
  },
  {
    id: "N2_1264",
    title: "Trả lời ý kiến, kiến nghị của cử tri về vấn đề tài chính địa phương",
    group: "Nhóm 2",
    category: "Lĩnh vực chung",
    maxScore: 200,
    benchmarkScore: 180,
    multiplier: 36,
    output: "Công văn trả lời cử tri chính thống"
  },
  {
    id: "N2_1265",
    title: "Trả lời đơn thư khiếu nại, tố cáo, phản ánh của công dân",
    group: "Nhóm 2",
    category: "Lĩnh vực chung",
    maxScore: 200,
    benchmarkScore: 180,
    multiplier: 36,
    output: "Văn bản giải quyết trả lời đơn thư"
  },
  {
    id: "N2_1269",
    title: "Phối hợp chấm điểm cải cách hành chính (CCHC) tỉnh hàng năm",
    group: "Nhóm 2",
    category: "Lĩnh vực chung",
    maxScore: 200,
    benchmarkScore: 150,
    multiplier: 30,
    output: "Báo cáo chấm điểm CCHC kèm minh chứng"
  },
  {
    id: "N2_1271",
    title: "Kế hoạch, báo cáo triển khai công tác đào tạo bồi dưỡng CBCCVC",
    group: "Nhóm 2",
    category: "Lĩnh vực văn phòng",
    maxScore: 200,
    benchmarkScore: 150,
    multiplier: 30,
    output: "Quyết định, kế hoạch đào tạo bồi dưỡng năm"
  },
  {
    id: "N2_1273",
    title: "Quyết định giao biên chế, hợp đồng lao động, chuyển đổi vị trí công tác",
    group: "Nhóm 2",
    category: "Lĩnh vực văn phòng",
    maxScore: 200,
    benchmarkScore: 180,
    multiplier: 36,
    output: "Quyết định nhân sự chính thức"
  },
  {
    id: "N2_1274",
    title: "Quản lý, triển khai công tác chuyển đổi số, Đề án 06 của Sở Tài chính",
    group: "Nhóm 2",
    category: "Lĩnh vực văn phòng",
    maxScore: 200,
    benchmarkScore: 180,
    multiplier: 36,
    output: "Kế hoạch hoặc báo cáo chuyển đổi số định kỳ"
  },
  {
    id: "N2_1275",
    title: "Báo cáo kết quả đánh giá, xếp loại công chức, người lao động định kỳ",
    group: "Nhóm 2",
    category: "Lĩnh vực văn phòng",
    maxScore: 200,
    benchmarkScore: 180,
    multiplier: 36,
    output: "Báo cáo xếp loại tháng/quý/năm kèm phụ biểu"
  },
  {
    id: "N2_1320",
    title: "Thẩm tra quyết toán vốn đầu tư dự án hoàn thành trên địa bàn tỉnh",
    group: "Nhóm 2",
    category: "Lĩnh vực đầu tư",
    maxScore: 200,
    benchmarkScore: 190,
    multiplier: 38,
    output: "Báo cáo kết quả thẩm tra quyết toán đầu tư"
  },
  {
    id: "N2_1321",
    title: "Phê duyệt quyết toán vốn đầu tư công dự án xây dựng cơ bản hoàn thành",
    group: "Nhóm 2",
    category: "Lĩnh vực đầu tư",
    maxScore: 200,
    benchmarkScore: 190,
    multiplier: 38,
    output: "Quyết định phê duyệt quyết toán vốn đầu tư"
  },
  {
    id: "N2_1322",
    title: "Thẩm định, kiểm tra quyết định quyết toán dự án hoàn thành của các huyện/thị",
    group: "Nhóm 2",
    category: "Lĩnh vực đầu tư",
    maxScore: 200,
    benchmarkScore: 190,
    multiplier: 38,
    output: "Báo cáo kiểm tra và Công văn kết luận thẩm định"
  },
  {
    id: "N2_1325",
    title: "Báo cáo Tình hình phân bổ, giải ngân vốn đầu tư công năm 2026",
    group: "Nhóm 2",
    category: "Lĩnh vực đầu tư",
    maxScore: 200,
    benchmarkScore: 190,
    multiplier: 38,
    output: "Báo cáo phân bổ/giải ngân vốn đầu tư công định kỳ"
  },

  // --- NHÓM 3 ---
  {
    id: "N3_760",
    title: "Xây dựng đề án vị trí việc làm công chức của Sở",
    group: "Nhóm 3",
    category: "Lĩnh vực văn phòng",
    maxScore: 300,
    benchmarkScore: 250,
    multiplier: 50,
    output: "Đề án vị trí việc làm được cơ quan có thẩm quyền phê duyệt"
  },
  {
    id: "N3_761",
    title: "Báo cáo kết quả thực hiện nhiệm vụ công tác tháng, năm của Sở Tài chính",
    group: "Nhóm 3",
    category: "Lĩnh vực văn phòng",
    maxScore: 300,
    benchmarkScore: 220,
    multiplier: 44,
    output: "Báo cáo công tác chính thức gửi UBND tỉnh"
  },
  {
    id: "N3_762",
    title: "Xây dựng chương trình công tác cả năm của Sở Tài chính",
    group: "Nhóm 3",
    category: "Lĩnh vực văn phòng",
    maxScore: 300,
    benchmarkScore: 220,
    multiplier: 44,
    output: "Kế hoạch chương trình hành động năm ban hành"
  },
  {
    id: "N3_764",
    title: "Quyết định quy định chức năng, nhiệm vụ, quyền hạn các phòng thuộc Sở",
    group: "Nhóm 3",
    category: "Lĩnh vực văn phòng",
    maxScore: 300,
    benchmarkScore: 250,
    multiplier: 50,
    output: "Quyết định chức năng nhiệm vụ được ký ban hành"
  },
  {
    id: "N3_821",
    title: "Theo dõi, đôn đốc, kiểm tra tham mưu, đề xuất giải pháp đẩy nhanh giải ngân vốn đầu tư công",
    group: "Nhóm 3",
    category: "Lĩnh vực đầu tư",
    maxScore: 300,
    benchmarkScore: 300,
    multiplier: 60,
    output: "Báo cáo tham mưu giải pháp gửi Thường trực Tỉnh ủy/UBND tỉnh"
  },
  {
    id: "N3_828",
    title: "Chấm điểm chỉ số cải cách hành chính (CCHC) cấp tỉnh - Lĩnh vực tài chính công",
    group: "Nhóm 3",
    category: "Lĩnh vực ngân sách",
    maxScore: 300,
    benchmarkScore: 300,
    multiplier: 60,
    output: "Hồ sơ chấm điểm tự đánh giá gửi Hội đồng thẩm định"
  },

  // --- NHÓM 4 ---
  {
    id: "N4_214",
    title: "Tham mưu ban hành văn bản quy phạm pháp luật trình HĐND, UBND tỉnh phê duyệt",
    group: "Nhóm 4",
    category: "Lĩnh vực chung",
    maxScore: 400,
    benchmarkScore: 400,
    multiplier: 80,
    output: "Dự thảo Nghị quyết, Quyết định kèm Tờ trình thẩm định"
  },
  {
    id: "N4_217",
    title: "Tham mưu Chương trình xúc tiến thu hút đầu tư tỉnh Cao Bằng năm 2026",
    group: "Nhóm 4",
    category: "Lĩnh vực phát triển doanh nghiệp",
    maxScore: 400,
    benchmarkScore: 380,
    multiplier: 76,
    output: "Chương trình xúc tiến đầu tư được phê duyệt ban hành"
  },
  {
    id: "N4_218",
    title: "Báo cáo phân tích chỉ số năng lực cạnh tranh cấp tỉnh (PCI) và giải pháp nâng cao hiệu quả",
    group: "Nhóm 4",
    category: "Lĩnh vực phát triển doanh nghiệp",
    maxScore: 400,
    benchmarkScore: 380,
    multiplier: 76,
    output: "Kế hoạch cải thiện chỉ số PCI tỉnh được ban hành"
  },

  // --- NHÓM 5 ---
  {
    id: "N5_64",
    title: "Tham mưu xây dựng Đề án cơ chế chính sách khuyến khích doanh nghiệp đầu tư vào vùng đặc biệt khó khăn",
    group: "Nhóm 5",
    category: "Lĩnh vực phát triển doanh nghiệp",
    maxScore: 500,
    benchmarkScore: 500,
    multiplier: 100,
    output: "Quyết định phê duyệt đề án của UBND tỉnh"
  },
  {
    id: "N5_70",
    title: "Xây dựng quy hoạch hoặc Kế hoạch phát triển kinh tế - xã hội 5 năm của tỉnh",
    group: "Nhóm 5",
    category: "Lĩnh vực chung",
    maxScore: 500,
    benchmarkScore: 500,
    multiplier: 100,
    output: "Quy hoạch/Kế hoạch phát triển được phê duyệt hoàn chỉnh"
  },
  {
    id: "N5_71",
    title: "Chủ trì xây dựng kịch bản tăng trưởng và điều hành kịch bản tài chính - kinh tế hằng năm",
    group: "Nhóm 5",
    category: "Lĩnh vực chung",
    maxScore: 500,
    benchmarkScore: 500,
    multiplier: 100,
    output: "Báo cáo kịch bản tăng trưởng cùng Nghị quyết điều hành"
  }
];
