import TaskInput from '../components/TaskInput';

function HomePage() {
  return (
    // Main container with a light gray background
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Content area, centered and with a max-width */}
      <div className="mx-auto max-w-4xl">
        {/* We will add a header here later */}

        {/* The main task list area */}
        <main className="mt-8">
          <TaskInput />
        </main>
      </div>
    </div>
  );
}

export default HomePage;
