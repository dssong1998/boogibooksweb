import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/books.add";
import { createBook, searchBooks, type NaverBookItem } from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "부기북스 - 책 추가" },
    { name: "description", content: "서재에 책 추가하기" },
  ];
}

export default function AddBook() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    isbn: "",
    publisher: "",
    coverUrl: "",
    description: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/");
    }
  }, [navigate]);

  const [searchResults, setSearchResults] = useState<NaverBookItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) return;
    
    setIsSearching(true);
    try {
      const data = await searchBooks(searchQuery);
      setSearchResults(data.items || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectBook = (naverBook: NaverBookItem) => {
    setBookData({
      title: naverBook.title.replace(/<\/?b>/g, ''),
      author: naverBook.author,
      isbn: naverBook.isbn,
      publisher: naverBook.publisher,
      coverUrl: naverBook.image,
      description: naverBook.description?.replace(/<\/?b>/g, '') || '',
    });
    setSearchResults([]);
  };

  const handleAddBook = async () => {
    try {
      await createBook(bookData);
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to add book:", error);
    }
  };

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
                책 추가하기
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {/* Search Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              책 검색
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="책 제목 또는 ISBN으로 검색"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
              >
                {isSearching ? "검색 중..." : "검색"}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              네이버 도서 검색을 통해 책을 찾을 수 있습니다
            </p>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                {searchResults.map((book, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectBook(book)}
                    className="flex items-start space-x-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    {book.image && (
                      <img
                        src={book.image}
                        alt={book.title}
                        className="w-16 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-semibold text-gray-900 dark:text-white"
                        dangerouslySetInnerHTML={{
                          __html: book.title,
                        }}
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {book.author}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {book.publisher} | ISBN: {book.isbn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              직접 입력
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  책 제목 *
                </label>
                <input
                  type="text"
                  value={bookData.title}
                  onChange={(e) =>
                    setBookData({ ...bookData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  저자 *
                </label>
                <input
                  type="text"
                  value={bookData.author}
                  onChange={(e) =>
                    setBookData({ ...bookData, author: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={bookData.isbn}
                    onChange={(e) =>
                      setBookData({ ...bookData, isbn: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    출판사
                  </label>
                  <input
                    type="text"
                    value={bookData.publisher}
                    onChange={(e) =>
                      setBookData({ ...bookData, publisher: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  표지 이미지 URL
                </label>
                <input
                  type="url"
                  value={bookData.coverUrl}
                  onChange={(e) =>
                    setBookData({ ...bookData, coverUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  설명
                </label>
                <textarea
                  value={bookData.description}
                  onChange={(e) =>
                    setBookData({ ...bookData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleAddBook}
                  disabled={!bookData.title || !bookData.author}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  서재에 추가
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
