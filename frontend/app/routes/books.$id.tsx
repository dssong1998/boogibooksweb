import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import ReactMarkdown from "react-markdown";
import type { Route } from "./+types/books.$id";
import {
  createComment,
  deleteBook,
  getBook,
  getCommentsByBook,
  type BookData,
  type CommentData,
  type CommentType,
} from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 책 상세" },
    { name: "description", content: "책 정보와 코멘트" },
  ];
}

const commentTypeConfig: Record<
  CommentType,
  { label: string; placeholder: string; color: string; icon: string }
> = {
  PREVIEW: {
    label: "프리뷰",
    placeholder: "책을 읽기 전 책에 대한 생각을 남겨보세요",
    color: "purple",
    icon: "👀",
  },
  REVIEW: {
    label: "리뷰",
    placeholder: "책을 다 읽고 난 후의 감상을 정리해보세요",
    color: "emerald",
    icon: "📝",
  },
  QUOTE: {
    label: "인용과 감상",
    placeholder: "책 속의 한 부분과 그에 대해 한 생각을 남겨보세요",
    color: "amber",
    icon: "💬",
  },
};

export default function BookDetail() {
  const navigate = useNavigate();
  const params = useParams();
  const bookId = params.id;

  const [newComment, setNewComment] = useState("");
  const [newCommentPage, setNewCommentPage] = useState("");
  const [newCommentType, setNewCommentType] = useState<CommentType>("REVIEW");
  const [showPageInput, setShowPageInput] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [book, setBook] = useState<BookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/");
      return;
    }

    const loadBook = async () => {
      if (!bookId) return;
      try {
        const [bookData, commentData] = await Promise.all([
          getBook(bookId),
          getCommentsByBook(bookId),
        ]);
        setBook(bookData);
        setComments(Array.isArray(commentData) ? commentData : []);
      } catch (error) {
        console.error("Failed to load book detail:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [bookId, navigate]);

  const handleTypeChange = (type: CommentType) => {
    setNewCommentType(type);
    // 인용과 감상일 때만 페이지 입력 여부를 물어봄
    if (type === "QUOTE") {
      // 페이지 입력 옵션 보이기
      setShowPageInput(false); // 일단 기본은 숨김, 체크박스로 선택
    } else {
      setShowPageInput(false);
      setNewCommentPage("");
    }
  };

  const handleAddComment = async () => {
    if (!bookId) return;
    try {
      const created = await createComment({
        bookId,
        type: newCommentType,
        content: newComment,
        page:
          newCommentType === "QUOTE" && showPageInput && newCommentPage
            ? Number(newCommentPage)
            : undefined,
      });
      setComments((prev) => [created, ...prev]);
      setNewComment("");
      setNewCommentPage("");
      setShowPageInput(false);
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleRemoveBook = async () => {
    if (!bookId) return;
    try {
      await deleteBook(bookId);
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to remove book:", error);
    }
  };

  // 설명 truncate
  const descriptionTruncateLength = 150;
  const shouldTruncate =
    book?.description && book.description.length > descriptionTruncateLength;
  const displayDescription =
    book?.description && !showFullDescription && shouldTruncate
      ? book.description.slice(0, descriptionTruncateLength) + "..."
      : book?.description;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {book?.title || "책 정보"}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {book?.author || ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Book Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-8">
              <img
                src={book?.coverUrl || ""}
                alt={book?.title || ""}
                className="w-full rounded-lg shadow-lg mb-4"
              />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {book?.title || "제목 없음"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {book?.author || "저자 정보 없음"}
              </p>

              {/* Book Description */}
              {book?.description && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {displayDescription}
                  </p>
                  {shouldTruncate && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-sm text-sage-600 dark:text-sage-400 hover:underline mt-1 font-medium"
                    >
                      {showFullDescription ? "접기" : "더보기"}
                    </button>
                  )}
                </div>
              )}

              {/* Book Metadata */}
              {book?.publisher && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                  출판사: {book.publisher}
                </div>
              )}
              {book?.isbn && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                  ISBN: {book.isbn}
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleRemoveBook}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  서재에서 제거
                </button>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                코멘트 작성
              </h2>

              {/* Comment Type Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  코멘트 유형
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(commentTypeConfig) as CommentType[]).map(
                    (type) => {
                      const config = commentTypeConfig[type];
                      const isSelected = newCommentType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => handleTypeChange(type)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? type === "PREVIEW"
                                ? "bg-purple-600 text-white"
                                : type === "REVIEW"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-amber-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                        >
                          {config.icon} {config.label}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Page Input for Quote type */}
              {newCommentType === "QUOTE" && (
                <div className="mb-4">
                  <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={showPageInput}
                      onChange={(e) => setShowPageInput(e.target.checked)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>페이지 번호 입력</span>
                  </label>
                  {showPageInput && (
                    <input
                      type="number"
                      value={newCommentPage}
                      onChange={(e) => setNewCommentPage(e.target.value)}
                      placeholder="예: 45"
                      className="mt-2 w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  )}
                </div>
              )}

              {/* Comment Textarea */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    내용 (마크다운 지원)
                  </label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={commentTypeConfig[newCommentType].placeholder}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none font-mono text-sm"
                  />
                </div>
                <button
                  onClick={handleAddComment}
                  disabled={!newComment}
                  className={`w-full px-4 py-2 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${
                    newCommentType === "PREVIEW"
                      ? "bg-purple-600 hover:bg-purple-700"
                      : newCommentType === "REVIEW"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  코멘트 작성
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                코멘트 ({comments.length})
              </h2>
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  아직 코멘트가 없습니다. 첫 코멘트를 남겨보세요!
                </div>
              ) : (
                comments.map((comment) => {
                  const displayName = comment.user?.username || "익명";
                  const commentType = (comment.type as CommentType) || "REVIEW";
                  const typeConfig = commentTypeConfig[commentType];
                  return (
                    <div
                      key={comment.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#8B9D83] to-[#6B7C63] rounded-full flex items-center justify-center text-white font-bold">
                            {displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {displayName}
                              </h3>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  commentType === "PREVIEW"
                                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                                    : commentType === "REVIEW"
                                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                                }`}
                              >
                                {typeConfig.icon} {typeConfig.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(comment.createdAt).toLocaleDateString(
                                "ko-KR",
                              )}
                              {comment.page && ` · ${comment.page}쪽`}
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* Markdown Rendered Content */}
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-white prose-blockquote:border-l-4 prose-blockquote:border-sage-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-700/50 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-pink-600 dark:prose-code:text-pink-400">
                        <ReactMarkdown>{comment.content}</ReactMarkdown>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
