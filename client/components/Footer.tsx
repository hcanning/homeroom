export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full bg-white text-[#333] mt-auto">
      <div className="container mx-auto py-8 text-sm flex items-center justify-between">
        <span>© {year}</span>
        <a
          href="https://hcann-apps.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#333] hover:underline"
        >
          HCANN Apps
        </a>
      </div>
    </footer>
  );
}
