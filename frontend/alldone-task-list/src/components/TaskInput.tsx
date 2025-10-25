import { PlusSquare } from 'lucide-react';

const TaskInput = () => {
  return (
    // A simple flex container to align the icon and text
    <div className="flex cursor-pointer items-center gap-3 p-2">
      {/* The Icon - Now blue */}
      <PlusSquare className="h-6 w-6 text-blue-800" strokeWidth={1.5} />

      {/* The Text - Now a lighter gray */}
      <span className="text-gray-400">Type to add new task</span>
    </div>
  );
};

export default TaskInput;
