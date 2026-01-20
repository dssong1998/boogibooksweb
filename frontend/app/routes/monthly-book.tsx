import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/monthly-book";
import { createBook, getCurrentMonthlyBooks, type MonthlyBookData } from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 이달의 책" },
    { name: "description", content: "이달의 책 추천" },
  ];
}

export default function MonthlyBook() {
  const navigate = useNavigate();
  const [monthlyBooks, setMonthlyBooks] = useState<MonthlyBookData[]>([]);
  const [selectedBook, setSelectedBook] = useState<MonthlyBookData | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/");
      return;
    }

    const loadMonthlyBooks = async () => {
      try {
        const data = await getCurrentMonthlyBooks();
        setMonthlyBooks(Array.isArray(data) ? data : []);
        if (data && data.length > 0) {
          setSelectedBook(data[0]);
        }
      } catch (error) {
        console.error("Failed to load monthly books:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMonthlyBooks();
  }, [navigate]);

  const handleAddToLibrary = async (book: MonthlyBookData) => {
    try {
      setIsAdding(true);
      await createBook({
        title: book.title,
        author: book.author,
        isbn: book.isbn || undefined,
        publisher: book.publisher || undefined,
        coverUrl: book.coverUrl || undefined,
        description: book.description || undefined,
      });
      alert("서재에 추가되었습니다!");
    } catch (error) {
      console.error("Failed to add book:", error);
      alert("추가에 실패했습니다.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleShare = async (book: MonthlyBookData) => {
    const shareText = `${book.title} - ${book.author}`;
    if (navigator.share) {
      await navigator.share({
        title: book.title,
        text: shareText,
      });
      return;
    }
    await navigator.clipboard.writeText(shareText);
    alert("클립보드에 복사되었습니다.");
  };

  const currentTopic = monthlyBooks.length > 0 ? monthlyBooks[0].topic : null;
  const currentYear = monthlyBooks.length > 0 ? monthlyBooks[0].year : new Date().getFullYear();
  const currentMonth = monthlyBooks.length > 0 ? monthlyBooks[0].month : new Date().getMonth() + 1;

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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                이달의 책
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            불러오는 중...
          </div>
        ) : monthlyBooks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              아직 이달의 책이 등록되지 않았습니다.
            </p>
          </div>
        ) : (
          <>
            {/* Month & Topic Header */}
            <div className="mb-6">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-md p-6 text-white">
                <h2 className="text-xl font-bold mb-2">
                  📚 {currentYear}년 {currentMonth}월의 책
                </h2>
                {currentTopic && (
                  <p className="text-lg opacity-90">
                    이달의 주제: <span className="font-bold">{currentTopic}</span>
                  </p>
                )}
                <p className="text-sm opacity-80 mt-2">
                  총 {monthlyBooks.length}권의 책이 선정되었습니다
                </p>
              </div>
            </div>

            {/* Book Tabs (if multiple books) */}
            {monthlyBooks.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {monthlyBooks.map((book, index) => (
                  <button
                    key={book.id}
                    onClick={() => setSelectedBook(book)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedBook?.id === book.id
                        ? "bg-amber-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {index + 1}. {book.title}
                  </button>
                ))}
              </div>
            )}

            {/* Selected Book Detail */}
            {selectedBook && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-8">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Book Cover */}
                    <div className="flex-shrink-0">
                      <img
                        src={selectedBook.coverUrl || ""}
                        alt={selectedBook.title}
                        className="w-64 h-auto rounded-lg shadow-lg mx-auto md:mx-0"
                      />
                    </div>

                    {/* Book Info */}
                    <div className="flex-1">
                      <div className="mb-6">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                          {selectedBook.title}
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                          {selectedBook.author}
                        </p>
                      </div>

                      {selectedBook.recommendation && (
                        <div className="space-y-3 mb-6 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border-l-4 border-amber-500">
                          <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                            💡 이 책을 추천하는 이유
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {selectedBook.recommendation}
                          </p>
                        </div>
                      )}

                      {selectedBook.description && (
                        <div className="space-y-3 mb-6">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            책 소개
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            {selectedBook.description}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            출판사
                          </span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {selectedBook.publisher || "정보 없음"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            ISBN
                          </span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {selectedBook.isbn || "정보 없음"}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleAddToLibrary(selectedBook)}
                          disabled={isAdding}
                          className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:bg-gray-400"
                        >
                          {isAdding ? "추가 중..." : "서재에 추가"}
                        </button>
                        <button
                          onClick={() => handleShare(selectedBook)}
                          className="px-6 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
                        >
                          공유하기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Books Grid (if multiple) */}
            {monthlyBooks.length > 1 && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  이달의 모든 책
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {monthlyBooks.map((book) => (
                    <div
                      key={book.id}
                      onClick={() => setSelectedBook(book)}
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer transition-all hover:shadow-lg ${
                        selectedBook?.id === book.id ? "ring-2 ring-amber-500" : ""
                      }`}
                    >
                      <img
                        src={book.coverUrl || ""}
                        alt={book.title}
                        className="w-full h-40 object-cover rounded-lg mb-3"
                      />
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                        {book.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {book.author}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
