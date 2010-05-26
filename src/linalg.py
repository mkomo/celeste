import unittest

class Vector:
    def __init__(self, data):
        self.data = data
    
    def __add__(self, other):
        self.__check_len(other)   
        return Vector(map(lambda x, y: x+y, self, other))
    
    def __check_len(self, other):
        if (len(self) != len(other)):
            raise Exception('vectors must have same length')
       
    def __getitem__(self, index):
        return self.data[index]
    
    def __len__(self):
        return len(self.data)    
    def __repr__(self):
        return repr(self.data)
    def __eq__(self, other):
        return self.data == other.data
    
class Matrix(Vector):
  def __init__(self, data):
    self.data = map(Vector, data)
    
    
class LinAlgTests(unittest.TestCase):
    def setUp(self):
        pass 
    def testVectorAdd(self):
        v1 = Vector([1,2,3])
        v2 = Vector([3,4,5])
        v3 = Vector([4,6,8])
        self.assertEqual(v1 + v2, v3)
    def testMatrixAdd(self):
        M1 = Matrix([[1,2],[3,4]])
        M2 = Matrix([[5,6],[7,8]])
        M3 = Matrix([[6,8],[10,12]])
        self.assertEqual(M1 + M2, M3)
    

def main():
    unittest.main()
    
if __name__ == '__main__':
    main() 